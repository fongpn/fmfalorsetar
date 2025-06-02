import { supabase } from './supabase';
import type { Shift, PaymentMethod } from '@/types';

// Start a new shift
export const startShift = async (userId: string): Promise<{
  success: boolean;
  shiftId?: string;
  message?: string;
}> => {
  try {
    // Check if user can start a shift
    const { data: checkResult, error: checkError } = await supabase.rpc('handle_start_shift_attempt', {
      user_id: userId,
    });

    if (checkError) {
      console.error('Error checking shift status:', checkError);
      return { success: false, message: 'Error checking shift status' };
    }

    if (!checkResult.can_start) {
      return { success: false, message: checkResult.message };
    }

    // If there's an active shift, return it
    if (checkResult.active_shift_id) {
      return { success: true, shiftId: checkResult.active_shift_id };
    }

    // Create a new shift
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        user_id: userId,
        start_time: new Date().toISOString(),
        manually_ended: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting shift:', error);
      return { success: false, message: 'Error starting shift' };
    }

    return { success: true, shiftId: data.id };
  } catch (error) {
    console.error('Unexpected error starting shift:', error);
    return { success: false, message: 'Unexpected error starting shift' };
  }
};

// End a shift
export const endShift = async (
  shiftId: string,
  userId: string,
  {
    declaredCash,
    declaredQr,
    declaredBankTransfer,
    notes,
    handoverTo,
  }: {
    declaredCash: number;
    declaredQr: number;
    declaredBankTransfer: number;
    notes?: string;
    handoverTo?: string;
  }
): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    // Update the shift
    const { error } = await supabase
      .from('shifts')
      .update({
        end_time: new Date().toISOString(),
        declared_cash: declaredCash,
        declared_qr: declaredQr,
        declared_bank_transfer: declaredBankTransfer,
        notes,
        handover_to: handoverTo,
      })
      .eq('id', shiftId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error ending shift:', error);
      return { success: false, message: 'Error ending shift' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error ending shift:', error);
    return { success: false, message: 'Unexpected error ending shift' };
  }
};

// Get active shift for current user
export const getActiveShift = async (userId: string): Promise<{
  shift?: Shift;
  error?: string;
}> => {
  try {
    // First, try to get all active shifts for the user
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error getting active shift:', error);
      return { error: 'Error getting active shift' };
    }

    // If no active shift found, return empty object
    if (!data) {
      return {};
    }

    // If we found an active shift, return it
    return { shift: data as Shift };
  } catch (error) {
    console.error('Unexpected error getting active shift:', error);
    return { error: 'Unexpected error getting active shift' };
  }
};

// Get shift totals by payment method
export const getShiftTotals = async (
  shiftId: string
): Promise<{
  totals: {
    cash: number;
    qr: number;
    bank_transfer: number;
  };
  error?: string;
}> => {
  try {
    // Get all payments for the shift
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, method')
      .eq('shift_id', shiftId);

    if (paymentsError) {
      console.error('Error getting shift payments:', paymentsError);
      return { 
        totals: { cash: 0, qr: 0, bank_transfer: 0 },
        error: 'Error getting shift payments'
      };
    }

    // Calculate totals by payment method
    const totals = {
      cash: 0,
      qr: 0,
      bank_transfer: 0,
    };

    payments.forEach((payment) => {
      const method = payment.method as PaymentMethod;
      if (method === 'cash') {
        totals.cash += payment.amount;
      } else if (method === 'qr') {
        totals.qr += payment.amount;
      } else if (method === 'bank_transfer') {
        totals.bank_transfer += payment.amount;
      }
    });

    return { totals };
  } catch (error) {
    console.error('Unexpected error getting shift totals:', error);
    return { 
      totals: { cash: 0, qr: 0, bank_transfer: 0 },
      error: 'Unexpected error getting shift totals'
    };
  }
};

// Get all active shifts (admin only)
export const getActiveShifts = async (): Promise<{
  shifts?: {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string | null;
    start_time: string;
  }[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('get_active_shifts_details');

    if (error) {
      console.error('Error getting active shifts:', error);
      return { error: 'Error getting active shifts' };
    }

    return { shifts: data };
  } catch (error) {
    console.error('Unexpected error getting active shifts:', error);
    return { error: 'Unexpected error getting active shifts' };
  }
};

// Manually end a shift (admin only)
export const adminEndShift = async (
  shiftId: string,
  adminId: string
): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('admin_manually_end_shift', {
      shift_id: shiftId,
      admin_id: adminId,
    });

    if (error) {
      console.error('Error manually ending shift:', error);
      return { success: false, message: 'Error manually ending shift' };
    }

    return { success: true, message: data };
  } catch (error) {
    console.error('Unexpected error manually ending shift:', error);
    return { success: false, message: 'Unexpected error manually ending shift' };
  }
};