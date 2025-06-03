import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { Plus, Search, Filter, UserCircle, ChevronUp, ChevronDown } from 'lucide-react'; // Added UserCircle for fallback and ChevronUp/Down for sorting
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
} from '@/components/ui/table'; // Imported Table components
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'; // Imported Avatar components
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@/lib/hooks/usePagination';
import { formatDate, getMemberStatusColor } from '@/lib/utils';
import type { Member } from '@/types';

const ITEMS_PER_PAGE_OPTIONS = [10, 15, 50, 100];

const MembersListPage = () => {
  const { user } = useAuth(); // user might not be directly used here, but useAuth could be for permission checks later
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(ITEMS_PER_PAGE_OPTIONS[1]); // Default to 15
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedMembers = [...members];
  if (sortBy === 'photo') {
    sortedMembers.sort((a, b) => {
      const aHasPhoto = !!a.photo_url;
      const bHasPhoto = !!b.photo_url;
      if (aHasPhoto === bHasPhoto) return 0;
      return (aHasPhoto ? -1 : 1) * (sortDirection === 'asc' ? 1 : -1);
    });
  }

  const membersWithPhotoUrls = useMemo(() => {
    return members.map(member => ({
      ...member,
      photoUrl: member.photo_url ? supabase.storage.from('member-photos').getPublicUrl(member.photo_url).data.publicUrl : undefined
    }));
  }, [members]);

  const filteredMembers = membersWithPhotoUrls.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      member.name.toLowerCase().includes(searchLower) ||
      member.member_id.toLowerCase().includes(searchLower) ||
      (member.nric?.toLowerCase() || '').includes(searchLower) || // Handle possible null NRIC
      (member.email?.toLowerCase() || '').includes(searchLower) || // Search by email
      (member.phone?.toLowerCase() || '').includes(searchLower);   // Search by phone

    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesType = typeFilter === 'all' || member.membership_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const {
    paginatedData: paginatedMembers,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    pageNumbers,
    // Removed setData if not directly manipulating the source data for pagination here
  } = usePagination({
    data: filteredMembers, // Use the client-side filtered members
    itemsPerPage: itemsPerPage,
  });

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true); // Set loading true at the start of fetch
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        // Map photo_url to public URL
        const membersWithPhotoUrl = (data as Member[]).map(member => {
          let public_photo_url = undefined;
          if (member.photo_url) {
            const { data: urlData } = supabase.storage.from('member-photos').getPublicUrl(member.photo_url);
            public_photo_url = urlData?.publicUrl;
          }
          return { ...member, public_photo_url };
        });
        setMembers(membersWithPhotoUrl);
      } catch (error) {
        console.error('Error fetching members:', error);
        // Optionally show a toast message here
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []); // Fetch members once on mount

  const handleRowClick = (memberId: string) => {
    navigate(`/members/${memberId}`);
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
        </div>
      </div>

      {/* Members Table or Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-1"> {/* Reduced spacing for skeletons to look more like table rows */}
          {[...Array(itemsPerPage)].map((_, i) => ( // Show skeletons based on itemsPerPage
             <div key={i} className="p-4 border rounded-md dark:border-gray-700"> {/* More table-row like skeleton */}
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
        <div className="border rounded-md dark:border-gray-700"> {/* Border around the table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] cursor-pointer select-none" onClick={() => {
                  if (sortBy === 'photo') {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('photo');
                    setSortDirection('asc');
                  }
                }}>
                  Photo
                  {sortBy === 'photo' && (
                    sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />
                  )}
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead className="hidden md:table-cell">NRIC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Valid Until</TableHead>
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
                      <AvatarImage src={member.photoUrl} alt={member.name} />
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
                  <TableCell className="hidden lg:table-cell">{formatDate(member.end_date)}</TableCell>
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

      {/* Pagination Controls */}
      {totalPages > 1 && !isLoading && (
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 mt-6">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
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
        </div>
      )}

      {/* Items per page selector at the bottom */}
      <div className="flex justify-center mt-4">
        <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Per Page" />
          </SelectTrigger>
          <SelectContent>
            {ITEMS_PER_PAGE_OPTIONS.map(option => (
              <SelectItem key={option} value={String(option)}>{option} / page</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default MembersListPage;