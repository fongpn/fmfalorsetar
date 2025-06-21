import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Clock, DollarSign, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export function Shifts() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const mockCurrentShift = {
    id: '1',
    start_time: '2024-01-15T08:00:00Z',
    starting_staff: 'John Smith',
    starting_cash_float: 100.00,
    current_transactions: 15,
    current_revenue: 450.00,
    status: 'ACTIVE'
  };

  const mockShiftHistory = [
    {
      id: '2',
      start_time: '2024-01-14T08:00:00Z',
      end_time: '2024-01-14T18:00:00Z',
      starting_staff: 'Sarah Johnson',
      ending_staff: 'Sarah Johnson',
      starting_cash_float: 100.00,
      ending_cash_balance: 380.00,
      system_calculated_cash: 375.00,
      cash_discrepancy: 5.00,
      total_transactions: 28,
      total_revenue: 720.00,
      status: 'CLOSED'
    },
    {
      id: '3',
      start_time: '2024-01-13T08:00:00Z',
      end_time: '2024-01-13T18:00:00Z',
      starting_staff: 'Mike Wilson',
      ending_staff: 'Mike Wilson',
      starting_cash_float: 100.00,
      ending_cash_balance: 295.00,
      system_calculated_cash: 295.00,
      cash_discrepancy: 0.00,
      total_transactions: 22,
      total_revenue: 580.00,
      status: 'CLOSED'
    }
  ];

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

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
            <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
              <Clock className="h-4 w-4 mr-2" />
              Start Shift
            </button>
            <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
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
              Current Shift
            </button>
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

        {/* Current Shift Tab */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {mockCurrentShift ? (
              <>
                {/* Current Shift Overview */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Active Shift</h3>
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
                      <p className="font-semibold text-gray-900">{mockCurrentShift.starting_staff}</p>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Clock className="h-4 w-4 mr-2" />
                        Duration
                      </div>
                      <p className="font-semibold text-gray-900">{formatDuration(mockCurrentShift.start_time)}</p>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Starting Float
                      </div>
                      <p className="font-semibold text-gray-900">RM{mockCurrentShift.starting_cash_float.toFixed(2)}</p>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        Started
                      </div>
                      <p className="font-semibold text-gray-900">
                        {new Date(mockCurrentShift.start_time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Shift Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">{mockCurrentShift.current_transactions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">RM{mockCurrentShift.current_revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Expected Cash</p>
                        <p className="text-2xl font-bold text-gray-900">
                          RM{(mockCurrentShift.starting_cash_float + mockCurrentShift.current_revenue).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active shift</p>
                <button className="mt-4 text-orange-600 hover:text-orange-700 underline">
                  Start a new shift
                </button>
              </div>
            )}
          </div>
        )}

        {/* Shift History Tab */}
        {activeTab === 'history' && (
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
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cash Reconciliation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockShiftHistory.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(shift.start_time).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(shift.start_time).toLocaleTimeString()} - {new Date(shift.end_time!).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{shift.starting_staff}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDuration(shift.start_time, shift.end_time)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">${shift.total_revenue.toFixed(2)}</div>
                          <div className="text-sm font-medium text-gray-900">RM{shift.total_revenue.toFixed(2)}</div>
                          <div className="text-sm text-gray-500">{shift.total_transactions} transactions</div>
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
                              RM{shift.ending_cash_balance.toFixed(2)}
                            </div>
                            {shift.cash_discrepancy !== 0 && (
                              <div className="text-sm text-amber-600">
                                {shift.cash_discrepancy > 0 ? '+' : ''}RM{shift.cash_discrepancy.toFixed(2)} variance
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}