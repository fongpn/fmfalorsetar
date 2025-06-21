import { supabase } from '../lib/supabase';
import { Member, MembershipPlan, Membership } from '../lib/supabase';

export interface MemberWithStatus extends Member {
  status: 'ACTIVE' | 'IN_GRACE' | 'EXPIRED';
  current_membership?: Membership & { plan: MembershipPlan };
  days_until_expiry?: number;
}

export interface NewMemberData {
  member_id_string: string;
  full_name: string;
  ic_passport_number?: string;
  phone_number?: string;
  photo_url?: string;
}

export interface MembershipPurchase {
  member_id: string;
  plan_id: string;
  payment_method: string;
  shift_id: string;
  processed_by: string;
  is_renewal: boolean;
}

class MemberService {
  async getGracePeriodDays(): Promise<number> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grace_period_days')
      .single();
    
    if (error) throw error;
    return parseInt(data.value) || 7;
  }

  async getRegistrationFee(): Promise<number> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'registration_fee_default')
      .single();
    
    if (error) throw error;
    return parseFloat(data.value) || 25.00;
  }

  async generateMemberId(): Promise<string> {
    // Get the highest existing member ID number (4-digit format)
    const { data, error } = await supabase
      .from('members')
      .select('member_id_string')
      .order('member_id_string', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      // Parse the member ID as integer and increment
      const lastId = data[0].member_id_string;
      const lastNumber = parseInt(lastId);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Return 4-digit padded number
    return nextNumber.toString().padStart(4, '0');
  }

  async generateMemberIdOld(): Promise<string> {
    // Legacy FMF-XXX format (keeping for reference)
    const { data, error } = await supabase
      .from('members')
      .select('member_id_string')
      .like('member_id_string', '%-%')
      .order('member_id_string', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastId = data[0].member_id_string;
      const match = lastId.match(/FMF-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `FMF-${nextNumber.toString().padStart(3, '0')}`;
  }

  async createMember(memberData: NewMemberData): Promise<Member> {
    // If member_id_string is empty, generate one
    if (!memberData.member_id_string || memberData.member_id_string.trim() === '') {
      memberData.member_id_string = await this.generateMemberId();
    }

    const { data, error } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMemberById(id: string): Promise<MemberWithStatus | null> {
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.calculateMemberStatus(member);
  }

  async getMemberByMemberId(memberIdString: string): Promise<MemberWithStatus | null> {
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('member_id_string', memberIdString)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!member) return null;

    return this.calculateMemberStatus(member);
  }

  async searchMembers(query: string): Promise<MemberWithStatus[]> {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .or(`full_name.ilike.%${query}%,member_id_string.ilike.%${query}%,email.ilike.%${query}%`)
      .order('full_name');

    if (error) throw error;

    const membersWithStatus = await Promise.all(
      members.map(member => this.calculateMemberStatus(member))
    );

    return membersWithStatus;
  }

  async getAllMembers(): Promise<MemberWithStatus[]> {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('full_name');

    if (error) throw error;

    const membersWithStatus = await Promise.all(
      members.map(member => this.calculateMemberStatus(member))
    );

    return membersWithStatus;
  }

  async calculateMemberStatus(member: Member): Promise<MemberWithStatus> {
    // Get current membership
    const { data: membership, error } = await supabase
      .from('memberships')
      .select(`
        *,
        plan:membership_plans(*)
      `)
      .eq('member_id', member.id)
      .eq('status', 'ACTIVE')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!membership) {
      return {
        ...member,
        status: 'EXPIRED'
      };
    }

    const today = new Date();
    const endDate = new Date(membership.end_date);
    const gracePeriodDays = await this.getGracePeriodDays();
    const graceEndDate = new Date(endDate);
    graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'ACTIVE' | 'IN_GRACE' | 'EXPIRED';
    if (today <= endDate) {
      status = 'ACTIVE';
    } else if (today <= graceEndDate) {
      status = 'IN_GRACE';
    } else {
      status = 'EXPIRED';
    }

    return {
      ...member,
      status,
      current_membership: membership,
      days_until_expiry: daysUntilExpiry
    };
  }

  async purchaseMembership(purchase: MembershipPurchase): Promise<{ membership: Membership; transactions: any[] }> {
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', purchase.plan_id)
      .single();

    if (planError) throw planError;

    const member = await this.getMemberById(purchase.member_id);
    if (!member) throw new Error('Member not found');

    // Calculate membership dates
    let startDate = new Date();
    
    if (purchase.is_renewal && member.current_membership && member.status === 'IN_GRACE') {
      // Back-date to expiry date for grace period renewals
      startDate = new Date(member.current_membership.end_date);
      startDate.setDate(startDate.getDate() + 1);
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.duration_months + plan.free_months_on_signup);

    // Create membership record
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert([{
        member_id: purchase.member_id,
        plan_id: purchase.plan_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'ACTIVE'
      }])
      .select()
      .single();

    if (membershipError) throw membershipError;

    // Mark old membership as expired if renewal
    if (purchase.is_renewal && member.current_membership) {
      await supabase
        .from('memberships')
        .update({ status: 'EXPIRED' })
        .eq('id', member.current_membership.id);
    }

    const transactions = [];

    // Create membership transaction
    const { data: membershipTransaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        shift_id: purchase.shift_id,
        amount: plan.price,
        payment_method: purchase.payment_method,
        type: 'MEMBERSHIP',
        related_id: membership.id,
        processed_by: purchase.processed_by,
        status: 'PAID'
      }])
      .select()
      .single();

    if (transactionError) throw transactionError;
    transactions.push(membershipTransaction);

    // Create registration fee transaction for new members
    if (!purchase.is_renewal && plan.has_registration_fee) {
      const registrationFee = await this.getRegistrationFee();
      
      const { data: regTransaction, error: regError } = await supabase
        .from('transactions')
        .insert([{
          shift_id: purchase.shift_id,
          amount: registrationFee,
          payment_method: purchase.payment_method,
          type: 'REGISTRATION_FEE',
          related_id: member.id,
          processed_by: purchase.processed_by,
          status: 'PAID'
        }])
        .select()
        .single();

      if (regError) throw regError;
      transactions.push(regTransaction);
    }

    return { membership, transactions };
  }

  async getMembershipPlans(): Promise<MembershipPlan[]> {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (error) throw error;
    return data;
  }

  async getAllMembershipPlans(): Promise<MembershipPlan[]> {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .order('price');

    if (error) throw error;
    return data;
  }

  async createMembershipPlan(planData: Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>): Promise<MembershipPlan> {
    const { data, error } = await supabase
      .from('membership_plans')
      .insert([planData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMembershipPlan(id: string, updates: Partial<MembershipPlan>): Promise<MembershipPlan> {
    const { data, error } = await supabase
      .from('membership_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteMembershipPlan(id: string): Promise<void> {
    // Check if plan is being used by any active memberships
    const { data: activeMemberships, error: checkError } = await supabase
      .from('memberships')
      .select('id')
      .eq('plan_id', id)
      .eq('status', 'ACTIVE')
      .limit(1);

    if (checkError) throw checkError;

    if (activeMemberships && activeMemberships.length > 0) {
      throw new Error('Cannot delete plan that has active memberships. Please deactivate the plan instead.');
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('membership_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const memberService = new MemberService();