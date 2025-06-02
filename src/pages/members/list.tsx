import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@/lib/hooks/usePagination';
import { formatDate, getMemberStatusColor } from '@/lib/utils';
import type { Member } from '@/types';

const MembersListPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const {
    paginatedData: paginatedMembers,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    pageNumbers,
  } = usePagination({
    data: members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.member_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.nric.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesType = typeFilter === 'all' || member.membership_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    }),
    itemsPerPage: 10,
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMembers(data as Member[]);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Members</h1>
        <Button asChild>
          <Link to="/members/new">
            <Plus className="w-4 h-4 mr-2" />
            New Member
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search by name, ID, or NRIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="grace">Grace Period</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedMembers.map((member) => (
            <Link key={member.id} to={`/members/${member.id}`}>
              <Card className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{member.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {member.member_id} • NRIC: {member.nric}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getMemberStatusColor(member.status)}
                    >
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </Badge>
                    <Badge variant="secondary">
                      {member.membership_type.charAt(0).toUpperCase() + member.membership_type.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Valid until: {formatDate(member.end_date)}
                </div>
              </Card>
            </Link>
          ))}

          {paginatedMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No members found
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {pageNumbers.map((number) => (
                <Button
                  key={number}
                  variant={currentPage === number ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => goToPage(number)}
                >
                  {number}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MembersListPage;