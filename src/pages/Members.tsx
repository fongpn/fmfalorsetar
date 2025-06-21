import React from 'react';
import { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Search, Plus, Filter, Grid, List, User } from 'lucide-react';
import { useMembers } from '../hooks/useMembers';
import { MemberCard } from '../components/Members/MemberCard';
import { NewMemberModal } from '../components/Members/NewMemberModal';


export function Members() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);
  const { members, loading, error, searchMembers, refreshMembers } = useMembers();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchMembers(query);
  };

  const filteredMembers = members.filter(member => {
    if (statusFilter === 'ALL') return true;
    return member.status === statusFilter;
  });

  const getStatusCounts = () => {
    return {
      ALL: members.length,
      ACTIVE: members.filter(m => m.status === 'ACTIVE').length,
      IN_GRACE: members.filter(m => m.status === 'IN_GRACE').length,
      EXPIRED: members.filter(m => m.status === 'EXPIRED').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <Layout title="Members" subtitle="Manage gym members and memberships">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4 mr-2" /> : <Grid className="h-4 w-4 mr-2" />}
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
            <button 
              onClick={() => setShowNewMemberModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Member
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-1">
          <div className="flex space-x-1">
            {[
              { key: 'ALL', label: 'All Members', count: statusCounts.ALL },
              { key: 'ACTIVE', label: 'Active', count: statusCounts.ACTIVE },
              { key: 'IN_GRACE', label: 'Grace Period', count: statusCounts.IN_GRACE },
              { key: 'EXPIRED', label: 'Expired', count: statusCounts.EXPIRED },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === filter.key
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={refreshMembers}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        )}

        {/* Members Grid/List */}
        {!loading && !error && (
          <>
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchQuery ? 'No members found matching your search.' : 'No members found.'}
                </p>
                {!searchQuery && (
                  <button 
                    onClick={() => setShowNewMemberModal(true)}
                    className="mt-6 inline-flex items-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-lg hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                  >
                    <User className="h-5 w-5 mr-3" />
                    Add your first member
                  </button>
                )}
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {filteredMembers.map((member) => (
                  <MemberCard 
                    key={member.id} 
                    member={member}
                    onClick={() => {
                      // TODO: Open member details modal
                      console.log('Open member details:', member.id);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Results Summary */}
            {filteredMembers.length > 0 && (
              <div className="text-center text-sm text-gray-500">
                Showing {filteredMembers.length} of {members.length} members
              </div>
            )}
          </>
        )}

        {/* New Member Modal */}
        <NewMemberModal
          isOpen={showNewMemberModal}
          onClose={() => setShowNewMemberModal(false)}
          onSuccess={() => {
            refreshMembers();
            setShowNewMemberModal(false);
          }}
        />
      </div>
    </Layout>
  );
}