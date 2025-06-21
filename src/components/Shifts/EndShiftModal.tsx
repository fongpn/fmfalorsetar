import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import { shiftService, EndShiftData } from '../../services/shiftService';
import { useAuth } from '../../contexts/AuthContext';
import { Shift, supabase } from '../../lib/supabase';

interface EndShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeShift: Shift | null;
}

export function EndShiftModal({ isOpen, onClose, onSuccess, activeShift }: EndShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [endingCashBalance, setEndingCashBalance] = useState<number>(0);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [shiftStats, setShiftStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    checkIns: 0,
    salesCount: 0
  });
  const { profile } = useAuth();

  useEffect(() => {
    if (isOpen && activeShift) {
      fetchShiftStats();
    }
  }, [isOpen, activeShift]);

  const fetchShiftStats = async () => {
    if (!activeShift) return;
    
    try {
      // Get shift transactions directly for cash calculation
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('shift_id', activeShift.id);

      if (error) throw error;

      const totalRevenue = (transactions || [])
        .filter(t => ['POS_SALE', 'WALK_IN', 'MEMBERSHIP', 'REGISTRATION_FEE', 'COUPON_SALE'].includes(t.type))
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const stats = await shiftService.getShiftStats(activeShift.id);
      setShiftStats({ ...stats, totalRevenue });
      
      // Set suggested ending cash balance
      const suggestedBalance = activeShift.starting_cash_float + totalRevenue;
      setEndingCashBalance(suggestedBalance);
    } catch (error) {
      console.error('Error fetching shift stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      setError('User profile not found');
      return;
    }

    if (!activeShift) {
      setError('No active shift found');
      return;
    }

    if (endingCashBalance < 0) {
      setError('Ending cash balance cannot be negative');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endData: EndShiftData = {
        ending_cash_balance: endingCashBalance,
        ending_staff_id: profile.id,
        system_calculated_cash: activeShift.starting_cash_float + shiftStats.totalRevenue,
        cash_discrepancy: endingCashBalance - (activeShift.starting_cash_float + shiftStats.totalRevenue),
        handover_notes: handoverNotes.trim() || undefined
      };

      // Update shift directly without complex query
      const { data: updatedShift, error } = await supabase
        .from('shifts')
        .update({
          end_time: new Date().toISOString(),
          ending_staff_id: endData.ending_staff_id,
          ending_cash_balance: endData.ending_cash_balance,
          system_calculated_cash: endData.system_calculated_cash,
          cash_discrepancy: endData.cash_discrepancy,
          status: 'CLOSED'
        })
        .eq('id', activeShift.id)
        .select()
        .single();

      if (error) throw error;
      
      const discrepancyMessage = endData.cash_discrepancy === 0 
        ? 'Cash reconciliation perfect!' 
        : `Cash discrepancy: ${endData.cash_discrepancy > 0 ? '+' : ''}RM${endData.cash_discrepancy.toFixed(2)}`;

      setSuccess(`Shift ended successfully. ${discrepancyMessage}`);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEndingCashBalance(0);
    setHandoverNotes('');
    setError('');
    setSuccess('');
    onClose();
  };

  const calculateDiscrepancy = () => {
    if (!activeShift) return 0;
    const expectedCash = activeShift.starting_cash_float + (shiftStats.totalRevenue || 0);
    return endingCashBalance - expectedCash;
  };

  const formatDuration = () => {
    if (!activeShift) return '';
    const start = new Date(activeShift.start_time);
    const now = new Date();
    const duration = now.getTime() - start.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (!isOpen || !activeShift) return null;

  const discrepancy = calculateDiscrepancy();
  const expectedCash = activeShift.starting_cash_float + (shiftStats.totalRevenue || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">End Shift</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Shift Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Shift Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Duration</p>
                <p className="font-medium">{formatDuration()}</p>
              </div>
              <div>
                <p className="text-gray-600">Staff</p>
                <p className="font-medium">{profile?.full_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Check-ins</p>
                <p className="font-medium">{shiftStats.checkIns}</p>
              </div>
              <div>
                <p className="text-gray-600">Sales</p>
                <p className="font-medium">{shiftStats.salesCount}</p>
              </div>
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Calculator className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">Cash Reconciliation</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Starting Float:</span>
                <span className="font-medium">RM{activeShift.starting_cash_float.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Total Revenue:</span>
                <span className="font-medium">RM{shiftStats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-2">
                <span className="text-blue-700 font-medium">Expected Cash:</span>
                <span className="font-bold">RM{(expectedCash || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Ending Cash Balance Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Cash Count *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={endingCashBalance}
                onChange={(e) => setEndingCashBalance(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Count all cash in the register and enter the total amount
            </p>
          </div>

          {/* Handover Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Handover Notes (Optional)
            </label>
            <textarea
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="Leave notes for the next shift staff..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include any important information for the next shift (issues, reminders, etc.)
            </p>
          </div>

          {/* Discrepancy Display */}
          {endingCashBalance > 0 && (
            <div className={`p-4 rounded-lg ${
              Math.abs(discrepancy) < 0.01 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cash Discrepancy:</span>
                <span className={`font-bold ${
                  Math.abs(discrepancy || 0) < 0.01 
                    ? 'text-green-700' 
                    : 'text-amber-700'
                }`}>
                  {(discrepancy || 0) === 0 ? 'Perfect!' : `${(discrepancy || 0) > 0 ? '+' : ''}RM${(discrepancy || 0).toFixed(2)}`}
                </span>
              </div>
              {Math.abs(discrepancy || 0) >= 0.01 && (
                <p className="text-xs text-amber-600 mt-1">
                  {(discrepancy || 0) > 0 ? 'Cash over expected amount' : 'Cash under expected amount'}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Ending...' : 'End Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}