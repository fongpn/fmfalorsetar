import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { shiftService, StartShiftData } from '../../services/shiftService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface StartShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StartShiftModal({ isOpen, onClose, onSuccess }: StartShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cashFloat, setCashFloat] = useState<number>(100);
  const [previousShiftNotes, setPreviousShiftNotes] = useState<string>('');
  const { profile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadPreviousShiftNotes();
    }
  }, [isOpen]);

  const loadPreviousShiftNotes = async () => {
    try {
      const { data: lastShift, error } = await supabase
        .from('shifts')
        .select('handover_notes, ending_staff_profile:profiles!shifts_ending_staff_id_fkey(full_name)')
        .eq('status', 'CLOSED')
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && lastShift?.handover_notes) {
        setPreviousShiftNotes(lastShift.handover_notes);
      } else {
        setPreviousShiftNotes('');
      }
    } catch (err) {
      console.warn('Could not load previous shift notes:', err);
      setPreviousShiftNotes('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      setError('User profile not found');
      return;
    }

    if (cashFloat < 0) {
      setError('Cash float cannot be negative');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const shiftData: StartShiftData = {
        starting_cash_float: cashFloat,
        starting_staff_id: profile.id
      };

      const result = await shiftService.startShift(shiftData);
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCashFloat(100);
    setPreviousShiftNotes('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Start New Shift</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* Previous Shift Handover Notes */}
          {previousShiftNotes && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-medium text-blue-900">Notes from Previous Shift</h3>
              </div>
              <div className="text-sm text-blue-700 bg-white p-3 rounded border">
                {previousShiftNotes}
              </div>
            </div>
          )}

          {/* Staff Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Staff Member</h3>
            <p className="text-sm text-gray-600">{profile?.full_name}</p>
            <p className="text-xs text-gray-500">{profile?.role}</p>
          </div>

          {/* Cash Float Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Cash Float *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={cashFloat}
                onChange={(e) => setCashFloat(parseFloat(e.target.value) || 0)}
                placeholder="100.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Amount of cash in the register at the start of shift
            </p>
          </div>

          {/* Shift Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">Shift Details</h3>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>Start Time: {new Date().toLocaleString()}</p>
              <p>Staff: {profile?.full_name}</p>
              <p>Cash Float: RM{cashFloat.toFixed(2)}</p>
            </div>
          </div>

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
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}