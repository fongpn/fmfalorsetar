import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, UserCircle, ChevronUp, ChevronDown } from 'lucide-react';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@/lib/hooks/usePagination';
import { formatDate, getMemberStatusColor } from '@/lib/utils';
import type { Member } from '@/types';

const ITEMS_PER_PAGE_OPTIONS = [10, 15, 50, 100];

// Define a type for the member with the added public_photo_url
type MemberWithPublicPhotoUrl = Member & { public_photo_url?: string };


const MembersListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<MemberWithPublicPhotoUrl[]>([]); // Use the extended type
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(ITEMS_PER_PAGE_OPTIONS[1]); // Default to 15
  
  // Note: sortBy and sortDirection were in the provided code but not fully implemented for all columns.
  // I'm keeping them here in case you plan to expand on sorting.
  // If not, they can be removed.
  const [sortBy, setSortBy] = useState<string>('created_at'); // Default sort
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');


  // Client-side filtering - consider server-side for large datasets
  const filteredAndSortedMembers = useMemo(() => {
    let processedMembers = members.filter(member => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        member.name.toLowerCase().includes(searchLower) ||
        member.member_id.toLowerCase().includes(searchLower) ||
        (member.nric?.toLowerCase() || '').includes(searchLower) ||
        (member.email?.toLowerCase() || '').includes(searchLower) ||
        (member.phone?.toLowerCase() || '').includes(searchLower);

      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesType = typeFilter === 'all' || member.membership_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sorting logic (example for name, created_at, and photo presence)
    if (sortBy) {
      processedMembers.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortBy === 'photo') {
          valA = !!a.public_photo_url;
          valB = !!b.public_photo_url;
        } else if (sortBy === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortBy === 'member_id') {
            valA = a.member_id.toLowerCase();
            valB = b.member_id.toLowerCase();
        } else if (sortBy === 'status') {
            valA = a.status.toLowerCase();
            valB = b.status.toLowerCase();
        } else if (sortBy === 'membership_type') {
            valA = a.membership_type.toLowerCase();
            valB = b.membership_type.toLowerCase();
        } else if (sortBy === 'end_date' || sortBy === 'created_at') {
          valA = new Date(a[sortBy as keyof Member]).getTime();
          valB = new Date(b[sortBy as keyof Member]).getTime();
        }
        // Add more cases for other sortable columns

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return processedMembers;
  }, [members, searchQuery, statusFilter, typeFilter, sortBy, sortDirection]);


  const {
    paginatedData: paginatedMembers,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    pageNumbers,
  } = usePagination({
    data: filteredAndSortedMembers, // Use filtered and sorted members
    itemsPerPage: itemsPerPage,
  });

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        // Default sorting order from the database
        let query = supabase
          .from('members')
          .select('*');

        // The client-side sorting will override this initial fetch order if sortBy is set
        query = query.order(sortBy || 'created_at', { ascending: sortDirection === 'asc' });


        const { data, error } = await query;

        if (error) throw error;
        
        const membersWithUrls = (data || []).map(member => {
          let publicPhotoUrlWithTimestamp = undefined;
          if (member.photo_url) {
            // Append a timestamp to the URL to help bypass browser cache if the image is updated
            const { data: urlData } = supabase.storage.from('member-photos').getPublicUrl(`${member.photo_url}?t=${new Date().getTime()}`);
            publicPhotoUrlWithTimestamp = urlData?.publicUrl;
          }
          return { ...member, public_photo_url: publicPhotoUrlWithTimestamp } as MemberWithPublicPhotoUrl;
        });
        setMembers(membersWithUrls);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [sortBy, sortDirection]); // Refetch if sortBy or sortDirection changes for server-side sorting (optional)
                               // For purely client-side sorting as implemented now, this dependency array can be just []

  const handleRowClick = (memberId: string) => {
    navigate(`/members/${memberId}`);
  };
  
  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortBy === columnKey) {
      return sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />;
    }
    return null; // Or a default neutral sort icon
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Members</h1>
        <Button asChild>
          <Link to="/members/new">
            <Plus className="w-4 h-4 mr-2" />
            New Member
          </Link>
        </Button>
      </div>

      {/* Filters and Search Section */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow md:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by Name, ID, NRIC, Email, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <Filter className="w-4 h-4 mr-2 text-gray-500" />
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
            <SelectTrigger className="w-full sm:w-[150px]">
              <Filter className="w-4 h-4 mr-2 text-gray-500" />
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
          {/* Removed itemsPerPage selector from here */}
        </div>
      </div>

      {isLoading ? (
         <div className="space-y-1">
           {[...Array(itemsPerPage)].map((_, i) => (
             <div key={i} className="p-4 border rounded-md dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-md dark:border-gray-700 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] cursor-pointer select-none" onClick={() => handleSort('photo')}>
                  Photo {renderSortIcon('photo')}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>Name {renderSortIcon('name')}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('member_id')}>Member ID {renderSortIcon('member_id')}</TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('nric')}>NRIC {renderSortIcon('nric')}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>Status {renderSortIcon('status')}</TableHead>
                <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => handleSort('membership_type')}>Type {renderSortIcon('membership_type')}</TableHead>
                <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('end_date')}>Valid Until {renderSortIcon('end_date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.length > 0 ? paginatedMembers.map((member) => (
                <TableRow 
                  key={member.id} 
                  onClick={() => handleRowClick(member.id)} 
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.public_photo_url} alt={member.name} />
                      <AvatarFallback>
                        {member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : <UserCircle className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.member_id}</TableCell>
                  <TableCell className="hidden md:table-cell">{member.nric || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${getMemberStatusColor(member.status)} px-2 py-0.5 text-xs`}
                    >
                      {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {member.membership_type ? member.membership_type.charAt(0).toUpperCase() + member.membership_type.slice(1) : 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{member.end_date ? formatDate(member.end_date) : 'N/A'}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No members found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls - Repositioned itemsPerPage selector */}
      {totalPages > 0 && !isLoading && ( // Changed condition to totalPages > 0
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(option => (
                  <SelectItem key={option} value={String(option)} className="text-xs">{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex gap-1 sm:gap-2 flex-wrap justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="hidden sm:inline-flex"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {pageNumbers.map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="flex items-center justify-center px-1 sm:px-3 py-1.5 text-sm">...</span>
              ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPage(page as number)}
                className="w-9 h-9 sm:w-auto sm:h-auto" // Make page number buttons square on small screens
              >
                {page}
              </Button>
              )
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="hidden sm:inline-flex"
            >
              Last
            </Button>
          </div>
        </div>
      )}
      {/* Removed the standalone itemsPerPage selector from the very bottom */}
    </div>
  );
};

export default MembersListPage;