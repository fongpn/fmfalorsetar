import { supabase } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { memberService, MemberWithStatus } from './memberService';

export interface MemberValidationResult {
  valid: boolean;
  member?: MemberWithStatus;
  message: string;
  hasCheckedInToday?: boolean;
  lastCheckInTime?: string;
}

export interface CheckInData {
  type: 'MEMBER' | 'COUPON' | 'WALK_IN' | 'WALK_IN_STUDENT';
  member_id?: string;
  sold_coupon_id?: string;
  shift_id: string;
  processed_by: string;
  notes?: string;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  check_in?: any;
  member?: MemberWithStatus;
  coupon?: any;
  transaction?: any;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: any;
  member?: MemberWithStatus;
  message: string;
}

class CheckInService {
  async validateMemberAccess(memberIdString: string): Promise<MemberValidationResult> {
    try {
      const member = await memberService.getMemberByMemberId(memberIdString);
      
      if (!member) {
        return {
          valid: false,
          message: 'Member not found. Please check the member ID.'
        };
      }

      // Check if member has already checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckIn, error: checkInError } = await supabase
        .from('check_ins')
        .select('id, check_in_time')
        .eq('member_id', member.id)
        .gte('check_in_time', today)
        .lt('check_in_time', `${today}T23:59:59.999Z`)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkInError) {
        console.warn('Error checking today\'s check-ins:', checkInError);
      }

      switch (member.status) {
        case 'ACTIVE':
          return {
            valid: true,
            member,
            message: `Welcome ${member.full_name}! Active membership.`,
            hasCheckedInToday: !!todayCheckIn,
            lastCheckInTime: todayCheckIn?.check_in_time
          };
        
        case 'IN_GRACE':
          return {
            valid: true,
            member,
            message: `Welcome ${member.full_name}! Membership in grace period - please renew soon.`,
            hasCheckedInToday: !!todayCheckIn,
            lastCheckInTime: todayCheckIn?.check_in_time
          };
        
        case 'EXPIRED':
          return {
            valid: false,
            member,
            message: `Membership expired. Please renew to access the gym.`,
            hasCheckedInToday: !!todayCheckIn,
            lastCheckInTime: todayCheckIn?.check_in_time
          };
        
        default:
          return {
            valid: false,
            member,
            message: 'Unable to determine membership status.',
            hasCheckedInToday: !!todayCheckIn,
            lastCheckInTime: todayCheckIn?.check_in_time
          };
      }
    } catch (error: any) {
      return {
        valid: false,
        message: `Error validating member: ${error.message}`,
        hasCheckedInToday: false
      };
    }
  }

  async validateCouponAccess(couponCode: string): Promise<CouponValidation> {
    try {
      const { data: coupon, error } = await supabase
        .from('sold_coupons')
        .select(`
          *,
          template:coupon_templates(*),
          member:members(*)
        `)
        .eq('code', couponCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            valid: false,
            message: 'Coupon not found. Please check the coupon code.'
          };
        }
        throw error;
      }

      // Check if coupon has expired
      const today = new Date();
      const expiryDate = new Date(coupon.expiry_date);
      
      if (today > expiryDate) {
        return {
          valid: false,
          coupon,
          message: 'Coupon has expired.'
        };
      }

      // Check if coupon has remaining entries
      if (coupon.entries_remaining <= 0) {
        return {
          valid: false,
          coupon,
          message: 'Coupon has no remaining entries.'
        };
      }

      let member: MemberWithStatus | undefined;
      if (coupon.member) {
        member = await memberService.calculateMemberStatus(coupon.member);
      }

      return {
        valid: true,
        coupon,
        member,
        message: `Valid coupon! ${coupon.entries_remaining} entries remaining.`
      };
    } catch (error: any) {
      return {
        valid: false,
        message: `Error validating coupon: ${error.message}`
      };
    }
  }

  async processCheckIn(checkInData: CheckInData): Promise<CheckInResult> {
    try {
      let result: CheckInResult;

      switch (checkInData.type) {
        case 'MEMBER':
          result = await this.processMemberCheckIn(checkInData);
          break;
        case 'COUPON':
          result = await this.processCouponCheckIn(checkInData);
          break;
        case 'WALK_IN':
          result = await this.processWalkInCheckIn(checkInData);
          break;
        case 'WALK_IN_STUDENT':
          result = await this.processStudentWalkInCheckIn(checkInData);
          break;
        default:
          throw new Error('Invalid check-in type');
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        message: `Check-in failed: ${error.message}`
      };
    }
  }

  private async processMemberCheckIn(checkInData: CheckInData): Promise<CheckInResult> {
    if (!checkInData.member_id) {
      throw new Error('Member ID is required for member check-in');
    }

    const member = await memberService.getMemberById(checkInData.member_id);
    if (!member) {
      throw new Error('Member not found');
    }

    const validation = await this.validateMemberAccess(member.member_id_string);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
        member: validation.member
      };
    }

    // Create check-in record
    const { data: checkIn, error } = await supabase
      .from('check_ins')
      .insert([{
        shift_id: checkInData.shift_id,
        type: 'MEMBER',
        member_id: checkInData.member_id,
        processed_by: checkInData.processed_by,
        notes: checkInData.notes
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: validation.message,
      check_in: checkIn,
      member: validation.member
    };
  }

  private async processCouponCheckIn(checkInData: CheckInData): Promise<CheckInResult> {
    if (!checkInData.sold_coupon_id) {
      throw new Error('Coupon ID is required for coupon check-in');
    }

    // Get coupon details
    const { data: coupon, error: couponError } = await supabase
      .from('sold_coupons')
      .select(`
        *,
        template:coupon_templates(*),
        member:members(*)
      `)
      .eq('id', checkInData.sold_coupon_id)
      .single();

    if (couponError) throw couponError;

    const validation = await this.validateCouponAccess(coupon.code);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
        coupon: validation.coupon
      };
    }

    // Create check-in record
    const { data: checkIn, error } = await supabase
      .from('check_ins')
      .insert([{
        shift_id: checkInData.shift_id,
        type: 'COUPON',
        sold_coupon_id: checkInData.sold_coupon_id,
        member_id: coupon.member_id,
        processed_by: checkInData.processed_by,
        notes: checkInData.notes
      }])
      .select()
      .single();

    if (error) throw error;

    // Decrement coupon entries
    const { error: updateError } = await supabase
      .from('sold_coupons')
      .update({ 
        entries_remaining: coupon.entries_remaining - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', checkInData.sold_coupon_id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `Check-in successful! ${coupon.entries_remaining - 1} entries remaining.`,
      check_in: checkIn,
      coupon: { ...coupon, entries_remaining: coupon.entries_remaining - 1 },
      member: validation.member
    };
  }

  private async processWalkInCheckIn(checkInData: CheckInData): Promise<CheckInResult> {
    // Get walk-in rate from system settings
    const { data: setting, error: settingError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'walk_in_rate')
      .single();

    if (settingError) throw settingError;

    const walkInRate = parseFloat(setting.value);

    // Create transaction for walk-in payment
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        shift_id: checkInData.shift_id,
        amount: walkInRate,
        payment_method: 'CASH', // Default to cash, can be modified
        type: 'WALK_IN',
        processed_by: checkInData.processed_by,
        status: 'PAID',
        notes: checkInData.notes
      }])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Create check-in record
    const { data: checkIn, error } = await supabase
      .from('check_ins')
      .insert([{
        shift_id: checkInData.shift_id,
        type: 'WALK_IN',
        processed_by: checkInData.processed_by,
        notes: checkInData.notes
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `Walk-in check-in successful! Payment: RM${walkInRate}`,
      check_in: checkIn,
      transaction
    };
  }

  private async processStudentWalkInCheckIn(checkInData: CheckInData): Promise<CheckInResult> {
    // Get student walk-in rate from system settings
    const { data: setting, error: settingError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'walk_in_student_rate')
      .single();

    if (settingError) throw settingError;

    const studentRate = parseFloat(setting.value);

    // Create transaction for student walk-in payment
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        shift_id: checkInData.shift_id,
        amount: studentRate,
        payment_method: 'CASH', // Default to cash, can be modified
        type: 'WALK_IN',
        processed_by: checkInData.processed_by,
        status: 'PAID',
        notes: `Student walk-in: ${checkInData.notes || 'Student access'}`
      }])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Create check-in record
    const { data: checkIn, error } = await supabase
      .from('check_ins')
      .insert([{
        shift_id: checkInData.shift_id,
        type: 'WALK_IN',
        processed_by: checkInData.processed_by,
        notes: `Student: ${checkInData.notes || 'Student walk-in'}`
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `Student check-in successful! Payment: RM${studentRate}`,
      check_in: checkIn,
      transaction
    };
  }

  async getTodayCheckIns(shiftId?: string): Promise<any[]> {
    let query = supabase
      .from('check_ins')
      .select(`
        *,
        member:members(*),
        sold_coupon:sold_coupons(
          *,
          template:coupon_templates(*)
        ),
        processed_by_profile:profiles!check_ins_processed_by_fkey(*)
      `)
      .order('check_in_time', { ascending: false });

    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    } else {
      // Get today's check-ins
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('check_in_time', today);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getCheckInStats(shiftId?: string): Promise<{
    total: number;
    members: number;
    coupons: number;
    walkIns: number;
    revenue: number;
  }> {
    try {
      let checkInsQuery = supabase
        .from('check_ins')
        .select('type');

      let transactionsQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'WALK_IN');

      if (shiftId) {
        checkInsQuery = checkInsQuery.eq('shift_id', shiftId);
        transactionsQuery = transactionsQuery.eq('shift_id', shiftId);
      } else {
        const today = new Date().toISOString().split('T')[0];
        checkInsQuery = checkInsQuery.gte('check_in_time', today);
        transactionsQuery = transactionsQuery.gte('created_at', today);
      }

      const [checkInsResult, transactionsResult] = await Promise.all([
        checkInsQuery,
        transactionsQuery
      ]);

      if (checkInsResult.error) throw checkInsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const checkIns = checkInsResult.data || [];
      const transactions = transactionsResult.data || [];

      const stats = {
        total: checkIns.length,
        members: checkIns.filter(c => c.type === 'MEMBER').length,
        coupons: checkIns.filter(c => c.type === 'COUPON').length,
        walkIns: checkIns.filter(c => c.type === 'WALK_IN').length,
        revenue: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
      };

      return stats;
    } catch (error: any) {
      throw new Error(`Failed to get check-in stats: ${error.message}`);
    }
  }
}

export const checkinService = new CheckInService();