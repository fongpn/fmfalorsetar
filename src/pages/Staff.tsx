import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Plus, Search, User, Shield, Mail, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Staff() {
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setStaff(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          color: 'bg-red-100 text-red-800',
          icon: Shield,
          label: 'Administrator'
        };
      case 'CS':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: User,
          label: 'Customer Service'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: User,
          label: role
        };
    }
  };

  const filteredStaff = staff.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout title="Staff Management" subtitle="Manage staff accounts and permissions">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Staff Management" subtitle="Manage staff accounts and permissions">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            New Staff Member
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchStaff}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Staff Grid */}
        {filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No staff found matching your search.' : 'No staff members found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staffMember) => {
              const roleConfig = getRoleConfig(staffMember.role);
              return (
                <div key={staffMember.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">{staffMember.full_name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConfig.color}`}>
                          <roleConfig.icon className="h-3 w-3 mr-1" />
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Joined {new Date(staffMember.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Updated: {new Date(staffMember.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Role Permissions Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-red-600 mr-2" />
                <h4 className="font-medium text-gray-900">Administrator</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Full system access</li>
                <li>• Manage staff accounts</li>
                <li>• Configure system settings</li>
                <li>• View all reports and analytics</li>
                <li>• Manage membership plans</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center mb-2">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-gray-900">Customer Service</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Process member check-ins</li>
                <li>• Manage member registrations</li>
                <li>• Handle POS transactions</li>
                <li>• View member information</li>
                <li>• Process renewals and payments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}