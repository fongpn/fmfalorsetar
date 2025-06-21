import { supabase } from '../lib/supabase';
import { Shift } from '../lib/supabase';

export interface StartShiftData {
  starting_cash_float: number;
  starting_staff_id: string;
}

export interface EndShiftData {
  ending_cash_balance: number;
  ending_staff_id: string;
  system_calculated_cash?: number;
  cash_discrepancy?: number;
  handover_notes?: string;
  handover_to_staff_id?: string;
}

export interface ShiftResult {
  success: boolean;
  message: string;
  shift?: Shift;
}

class ShiftService {
  async startShift(shiftData: StartShiftData): Promise<ShiftResult> {
    try {
      // Check if the current user already has an active shift
      const { data: existingShift, error: checkError } = await supabase
        .from('shifts')
        .select('id')
        .eq('status', 'ACTIVE')
        .eq('starting_staff_id', shiftData.starting_staff_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingShift) {
        return {
          success: false,
          message: 'You already have an active shift. Please end your current shift before starting a new one.'
        };
      }

      // Create new shift
      const { data: shift, error } = await supabase
        .from('shifts')
        .insert([{
          starting_staff_id: shiftData.starting_staff_id,
          starting_cash_float: shiftData.starting_cash_float,
          status: 'ACTIVE'
        }])
        .select()
        .single();

      if (error) throw error;

      // Link the previous shift to this new shift
      try {
        const { data: previousShift, error: prevError } = await supabase
          .from('shifts')
          .select('id')
          .eq('status', 'CLOSED')
          .eq('starting_staff_id', shiftData.starting_staff_id)
          .order('end_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!prevError && previousShift) {
          await supabase
            .from('shifts')
            .update({ next_shift_id: shift.id })
            .eq('id', previousShift.id);
        }
      } catch (linkError) {
        // Don't fail the shift creation if linking fails
        console.warn('Failed to link previous shift:', linkError);
      }

      return {
        success: true,
        message: `Shift started successfully with RM${shiftData.starting_cash_float.toFixed(2)} cash float.`,
        shift
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to start shift: ${error.message}`
      };
    }
  }

  async endShift(shiftId: string, endData: EndShiftData): Promise<ShiftResult> {
    try {
      // Get current shift data to calculate discrepancy
      const { data: currentShift, error: fetchError } = await supabase
        .from('shifts')
        .select(`
          *,
          transactions!inner(amount, type)
        `)
        .eq('id', shiftId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!currentShift) {
        return {
          success: false,
          message: 'Active shift not found or already ended.'
        };
      }

      // Calculate system calculated cash
      const totalRevenue = currentShift.transactions
        .filter((t: any) => ['POS_SALE', 'WALK_IN', 'MEMBERSHIP', 'REGISTRATION_FEE', 'COUPON_SALE'].includes(t.type))
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      const systemCalculatedCash = currentShift.starting_cash_float + totalRevenue;
      const cashDiscrepancy = endData.ending_cash_balance - systemCalculatedCash;

      // Update shift with end data
      const { data: shift, error } = await supabase
        .from('shifts')
        .update({
          end_time: new Date().toISOString(),
          ending_staff_id: endData.ending_staff_id,
          ending_cash_balance: endData.ending_cash_balance,
          system_calculated_cash: systemCalculatedCash,
          cash_discrepancy: cashDiscrepancy,
          handover_notes: endData.handover_notes,
          handover_to_staff_id: endData.handover_to_staff_id,
          status: 'CLOSED'
        })
        .eq('id', shiftId)
        .select()
        .single();

      if (error) throw error;

      const discrepancyMessage = cashDiscrepancy === 0 
        ? 'Cash reconciliation perfect!' 
        : `Cash discrepancy: ${cashDiscrepancy > 0 ? '+' : ''}RM${cashDiscrepancy.toFixed(2)}`;

      return {
        success: true,
        message: `Shift ended successfully. ${discrepancyMessage}`,
        shift
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to end shift: ${error.message}`
      };
    }
  }

  async getActiveShift(staffId?: string): Promise<Shift | null> {
    try {
      let query = supabase
        .from('shifts')
        .select(`
          *,
          starting_staff_profile:profiles!shifts_starting_staff_id_fkey(full_name),
          ending_staff_profile:profiles!shifts_ending_staff_id_fkey(full_name)
        `)
        .eq('status', 'ACTIVE');

      if (staffId) {
        query = query.eq('starting_staff_id', staffId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active shift:', error);
      return null;
    }
  }

  async getAllActiveShifts(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          starting_staff_profile:profiles!shifts_starting_staff_id_fkey(full_name),
          ending_staff_profile:profiles!shifts_ending_staff_id_fkey(full_name)
        `)
        .eq('status', 'ACTIVE')
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all active shifts:', error);
      return [];
    }
  }

  async getShiftHistory(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          starting_staff_profile:profiles!shifts_starting_staff_id_fkey(full_name),
          ending_staff_profile:profiles!shifts_ending_staff_id_fkey(full_name),
          handover_to_staff_profile:profiles!shifts_handover_to_staff_id_fkey(full_name),
          next_shift:shifts(id, start_time)
        `)
        .eq('status', 'CLOSED')
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shift history:', error);
      return [];
    }
  }

  async getShiftStats(shiftId: string): Promise<{
    totalTransactions: number;
    totalRevenue: number;
    checkIns: number;
    salesCount: number;
  }> {
    try {
      const [transactionsResult, checkInsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type')
          .eq('shift_id', shiftId),
        supabase
          .from('check_ins')
          .select('id')
          .eq('shift_id', shiftId)
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (checkInsResult.error) throw checkInsResult.error;

      const transactions = transactionsResult.data || [];
      const checkIns = checkInsResult.data || [];

      const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const salesCount = transactions.filter(t => t.type === 'POS_SALE').length;

      return {
        totalTransactions: transactions.length,
        totalRevenue,
        checkIns: checkIns.length,
        salesCount
      };
    } catch (error) {
      console.error('Error fetching shift stats:', error);
      return {
        totalTransactions: 0,
        totalRevenue: 0,
        checkIns: 0,
        salesCount: 0
      };
    }
  }

  async getShiftHandoverInfo(shiftId: string): Promise<{
    handoverNotes?: string;
    previousShift?: any;
    nextShift?: any;
  }> {
    try {
      const { data: shift, error } = await supabase
        .from('shifts')
        .select(`
          handover_notes,
          previous_shift:shifts(
            id,
            start_time,
            end_time,
            handover_notes,
            ending_staff_profile:profiles!shifts_ending_staff_id_fkey(full_name)
          ),
          next_shift:shifts(
            id,
            start_time,
            starting_staff_profile:profiles!shifts_starting_staff_id_fkey(full_name)
          )
        `)
        .eq('id', shiftId)
        .single();

      if (error) throw error;

      return {
        handoverNotes: shift.handover_notes,
        previousShift: shift.previous_shift,
        nextShift: shift.next_shift
      };
    } catch (error) {
      console.error('Error fetching shift handover info:', error);
      return {};
    }
  }

  async getAllStaffMembers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching staff members:', error);
      return [];
    }
  }
}
export const shiftService = new ShiftService();