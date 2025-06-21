import React from 'react';
import { User, Ticket, DollarSign, Clock } from 'lucide-react';

interface CheckInListProps {
  checkIns: any[];
  loading: boolean;
}

export function CheckInList({ checkIns, loading }: CheckInListProps) {
  const getCheckInIcon = (type: string) => {
    switch (type) {
      case 'MEMBER':
        return <User className="h-4 w-4 text-green-600" />;
      case 'COUPON':
        return <Ticket className="h-4 w-4 text-blue-600" />;
      case 'WALK_IN':
        return <DollarSign className="h-4 w-4 text-orange-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCheckInTypeLabel = (type: string) => {
    switch (type) {
      case 'MEMBER':
        return 'Member';
      case 'COUPON':
        return 'Coupon';
      case 'WALK_IN':
        return 'Walk-in';
      default:
        return type;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No check-ins yet today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Check-ins</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {checkIns.map((checkIn) => (
          <div key={checkIn.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getCheckInIcon(checkIn.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {checkIn.member?.full_name || 'Walk-in Guest'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      checkIn.type === 'MEMBER' ? 'bg-green-100 text-green-800' :
                      checkIn.type === 'COUPON' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {getCheckInTypeLabel(checkIn.type)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1">
                    {checkIn.member?.member_id_string && (
                      <p className="text-sm text-gray-500">
                        ID: {checkIn.member.member_id_string}
                      </p>
                    )}
                    
                    {checkIn.sold_coupon && (
                      <p className="text-sm text-gray-500">
                        {checkIn.sold_coupon.template.name}
                      </p>
                    )}
                    
                    <p className="text-sm text-gray-500">
                      by {checkIn.processed_by_profile?.full_name}
                    </p>
                  </div>
                  
                  {checkIn.notes && (
                    <p className="text-sm text-gray-400 mt-1">{checkIn.notes}</p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatTime(checkIn.check_in_time)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {checkIns.length > 10 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            View All Check-ins
          </button>
        </div>
      )}
    </div>
  );
}