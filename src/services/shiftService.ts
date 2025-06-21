import { supabase } from '../lib/supabase';
import { Shift } from '../lib/supabase';

export interface StartShiftData {
  starting_cash_float: number;
  starting_staff_id: string;
}

export interface EndShiftData {
  ending_cash_balance: number;
  ending_staff_id: string;
  notes?: string;
}

export interface ShiftResult {
  success: boolean;
  message: string;
  shift?: Shift;
}

class ShiftService {
  async startShift(shiftData: StartShiftData): Promise<ShiftResult> {
    try {
      // Check if there's already an active shift
      const { data: existingShift, error: checkError } = await supabase
        .from('shifts')
        .select('id')
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingShift) {
        return {
          success: false,
          message: 'There is already an active shift. Please end the current shift before starting a new one.'
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
        .single();

      if (fetchError) throw fetchError;

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

  async getActiveShift(): Promise<Shift | null> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          starting_staff_profile:profiles!shifts_starting_staff_id_fkey(full_name)
        `)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active shift:', error);
      return null;
    }
  }

  async getShiftHistory(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          starting_staff_profile:profiles!shifts_starting_staff_id_fkey(full_name),
          ending_staff_profile:profiles!shifts_ending_staff_id_fkey(full_name)
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
}

export const shiftService = new ShiftService();