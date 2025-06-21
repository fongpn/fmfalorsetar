import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { StartShiftModal } from '../components/Shifts/StartShiftModal';
import { EndShiftModal } from '../components/Shifts/EndShiftModal';
import { Clock, DollarSign, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { shiftService } from '../services/shiftService';
import { useShift } from '../hooks/useShift';
import { useAuth } from '../contexts/AuthContext';

export function Shifts() {
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'all-active'>('current');
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [allActiveShifts, setAllActiveShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [selectedShiftToEnd, setSelectedShiftToEnd] = useState<any | null>(null);
  const { activeShift, refreshShift } = useShift();
  const { profile } = useAuth();

  React.useEffect(() => {
    fetchShiftHistory();
    if (profile?.role === 'ADMIN') {
      fetchAllActiveShifts();
    }
  }, []);

  const fetchShiftHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await shiftService.getShiftHistory(10);
      setShiftHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllActiveShifts = async () => {
    try {
      const data = await shiftService.getAllActiveShifts();
      setAllActiveShifts(data);
    } catch (err: any) {
      console.error('Error fetching all active shifts:', err);
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleShiftSuccess = () => {
    refreshShift();
    fetchShiftHistory();
    if (profile?.role === 'ADMIN') {
      fetchAllActiveShifts();
    }
  };

  const handleEndOtherShift = (shift: any) => {
    setSelectedShiftToEnd(shift);
    setShowEndModal(true);
  };

  const handleEndModalClose = () => {
    setShowEndModal(false);
    setSelectedShiftToEnd(null);
  };

  if (loading) {
    return (
      <Layout title="Shifts" subtitle="Manage staff shifts and cash reconciliation">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Shifts" subtitle="Manage staff shifts and cash reconciliation">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Shift Management</h2>
            <p className="text-sm text-gray-600">Track shifts and manage cash reconciliation</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setShowStartModal(true)}
              disabled={!!activeShift}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="h-4 w-4 mr-2" />
              Start Shift
            </button>
            <button 
              onClick={() => {
                setSelectedShiftToEnd(null);
                setShowEndModal(true);
              }}
              disabled={!activeShift}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              End Shift
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'current'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Shift
            </button>
            {profile?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('all-active')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'all-active'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Active Shifts ({allActiveShifts.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'history'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Shift History
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchShiftHistory}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Current Shift Tab */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {activeShift ? (
              <>
                {/* Current Shift Overview */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">My Active Shift</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <User className="h-4 w-4 mr-2" />
                        Staff Member
                      </div>
                      <p className="font-semibold text-gray-900">{activeShift.starting_staff_profile?.full_name || 'Loading...'}</p>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Clock className="h-4 w-4 mr-2" />
                        Duration
                      </div>
                      <p className="font-semibold text-gray-900">{formatDuration(activeShift.start_time)}</p>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Starting Float
                      </div>
                      <p className="font-semibold text-gray-900">RM{activeShift.starting_cash_float.toFixed(2)}</p>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        Started
                      </div>
                      <p className="font-semibold text-gray-900">
                        {new Date(activeShift.start_time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    Your shift is active. All transactions and check-ins will be recorded under this shift.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active shift</p>
                <p className="text-sm text-gray-400 mb-6">You need to start a shift to process transactions</p>
                <button 
                  onClick={() => setShowStartModal(true)}
                  className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  Start New Shift
                </button>
              </div>
            )}
          </div>
        )}

        {/* All Active Shifts Tab (Admin Only) */}
        {activeTab === 'all-active' && profile?.role === 'ADMIN' && (
          <>
            {allActiveShifts.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active shifts</p>
                <p className="text-sm text-gray-400">No staff members currently have active shifts</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">All Active Shifts</h3>
                  <p className="text-sm text-gray-600">Manage all currently active shifts across all staff</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Staff Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Started
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cash Float
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allActiveShifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                <User className="h-4 w-4 text-gray-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {shift.starting_staff_profile?.full_name}
                                </div>
                                {shift.starting_staff_id === profile?.id && (
                                  <div className="text-xs text-green-600">Your shift</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(shift.start_time).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(shift.start_time).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDuration(shift.start_time)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              RM{shift.starting_cash_float.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEndOtherShift(shift)}
                              className="text-red-600 hover:text-red-900"
                            >
                              End Shift
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Shift History Tab */}
        {activeTab === 'history' && (
          <>
            {shiftHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No shift history found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shift Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Staff
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cash Float
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cash Reconciliation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Handover
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Handed Over To
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shiftHistory.map((shift) => (
                        <tr key={shift.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(shift.start_time).toLocaleDateString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(shift.start_time).toLocaleTimeString()} - {shift.end_time ? new Date(shift.end_time).toLocaleTimeString() : 'Ongoing'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {shift.starting_staff_profile?.full_name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDuration(shift.start_time, shift.end_time)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              RM{shift.starting_cash_float.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {shift.cash_discrepancy === 0 ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  RM{(shift.ending_cash_balance || 0).toFixed(2)}
                                </div>
                                {shift.cash_discrepancy !== 0 && (
                                  <div className="text-sm text-amber-600">
                                    {shift.cash_discrepancy > 0 ? '+' : ''}RM{(shift.cash_discrepancy || 0).toFixed(2)} variance
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              {shift.handover_notes ? (
                                <div className="text-sm text-gray-900">
                                  <div className="truncate" title={shift.handover_notes}>
                                    {shift.handover_notes}
                                  </div>
                                  {shift.next_shift && (
                                    <div className="text-xs text-green-600 mt-1">
                                      → Linked to next shift
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No notes</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {shift.handover_to_staff_profile?.full_name || (
                                <span className="text-gray-400">Not specified</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <StartShiftModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onSuccess={handleShiftSuccess}
      />

      <EndShiftModal
        isOpen={showEndModal}
        onClose={handleEndModalClose}
        onSuccess={handleShiftSuccess}
        activeShift={selectedShiftToEnd || activeShift}
      />
    </Layout>
  );
}