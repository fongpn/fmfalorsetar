import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { CheckInModal } from '../components/CheckIn/CheckInModal';
import { CheckInList } from '../components/CheckIn/CheckInList';
import { CheckInStats } from '../components/CheckIn/CheckInStats';
import { checkinService } from '../services/checkinService';
import { useShift } from '../hooks/useShift';
import { Plus, RefreshCw, Calendar, Filter } from 'lucide-react';

export function CheckIns() {
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    members: 0,
    coupons: 0,
    walkIns: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'shift'>('today');
  
  const { activeShift } = useShift();

  useEffect(() => {
    fetchCheckInData();
  }, [viewMode, activeShift]);

  const fetchCheckInData = async () => {
    try {
      setLoading(true);
      setError(null);

      const shiftId = viewMode === 'shift' ? activeShift?.id : undefined;
      
      const [checkInsData, statsData] = await Promise.all([
        checkinService.getTodayCheckIns(shiftId),
        checkinService.getCheckInStats(shiftId)
      ]);

      setCheckIns(checkInsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = () => {
    fetchCheckInData();
    setShowCheckInModal(false);
  };

  const getSubtitle = () => {
    if (viewMode === 'shift' && activeShift) {
      return `Current shift started ${new Date(activeShift.start_time).toLocaleString()}`;
    }
    return `Today's gym access and entry management`;
  };

  return (
    <Layout title="Check-ins" subtitle={getSubtitle()}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('today')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'today'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="h-4 w-4 mr-2 inline" />
                Today
              </button>
              <button
                onClick={() => setViewMode('shift')}
                disabled={!activeShift}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'shift'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'
                }`}
              >
                <Filter className="h-4 w-4 mr-2 inline" />
                Current Shift
              </button>
            </div>

            {!activeShift && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                No active shift - start a shift to process check-ins
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={fetchCheckInData}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCheckInModal(true)}
              disabled={!activeShift}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Check-in
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchCheckInData}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <CheckInStats stats={stats} loading={loading} />

        {/* Check-ins List */}
        <CheckInList checkIns={checkIns} loading={loading} />

        {/* Check-in Modal */}
        <CheckInModal
          isOpen={showCheckInModal}
          onClose={() => setShowCheckInModal(false)}
          onSuccess={handleCheckInSuccess}
        />
      </div>
    </Layout>
  );
}