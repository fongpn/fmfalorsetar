import React from 'react';
import { User, Mail, Phone, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { MemberWithStatus } from '../../services/memberService';

interface MemberCardProps {
  member: MemberWithStatus;
  onClick?: () => void;
}

export function MemberCard({ member, onClick }: MemberCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✓',
          label: 'Active'
        };
      case 'IN_GRACE':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: '⚠',
          label: 'Grace Period'
        };
      case 'EXPIRED':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '✗',
          label: 'Expired'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '?',
          label: 'Unknown'
        };
    }
  };

  const statusConfig = getStatusConfig(member.status);

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            {member.photo_url ? (
              <img 
                src={member.photo_url} 
                alt={member.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{member.full_name}</h3>
            <p className="text-sm text-gray-500">{member.member_id_string}</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
          <span className="mr-1">{statusConfig.icon}</span>
          {statusConfig.label}
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {member.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>{member.email}</span>
          </div>
        )}
        
        {member.phone_number && (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>{member.phone_number}</span>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>Joined {new Date(member.join_date).toLocaleDateString()}</span>
        </div>

        {member.current_membership && (
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>
              {member.current_membership.plan.name} - 
              Expires {new Date(member.current_membership.end_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {member.status === 'IN_GRACE' && member.days_until_expiry !== undefined && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Membership expired {Math.abs(member.days_until_expiry)} days ago
            </span>
          </div>
        </div>
      )}

      {member.status === 'ACTIVE' && member.days_until_expiry !== undefined && member.days_until_expiry <= 7 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-800">
              Expires in {member.days_until_expiry} day{member.days_until_expiry !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}