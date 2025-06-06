import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { formatDate, getMemberStatusColor } from '@/lib/utils';
import { History, RefreshCw, X } from 'lucide-react';
import type { Member } from '@/types';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ValidateMemberPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [settings, setSettings] = useState<{ adult_walk_in_price: number }>({ adult_walk_in_price: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Memoize photo URL generation to avoid re-calculating on every render
  const memberPhotoUrl = useMemo(() => {
    if (member?.photo_url) {
      const { data } = supabase.storage.from('member-photos').getPublicUrl(member.photo_url);
      return data?.publicUrl;
    }
    return undefined;
  }, [member]);


  // Reset handler with stable dependencies
  const handleReset = useCallback(() => {
    setMember(null);
    setIsCheckedIn(false);
    setShowHistory(false);
    setCheckInHistory([]);
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    // Focus after state updates have settled
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, []); // Empty dependency array as it doesn't depend on external state

  // Keyboard shortcuts with stable dependencies using refs
  const handleCheckInRef = useRef(handleCheckIn);
  useEffect(() => {
    handleCheckInRef.current = handleCheckIn;
  }); // Keep ref updated on every render

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleReset();
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        // Call the latest version of handleCheckIn via the ref
        handleCheckInRef.current(); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset]); // handleReset is stable due to useCallback

  useEffect(() => {
    searchInputRef.current?.focus();
    
    const fetchSettings = async () => {
      const { data, error } = await supabase.rpc('get_settings');
      if (!error && data) {
        setSettings({ adult_walk_in_price: (data as any).adult_walk_in_price });
      }
    };
    fetchSettings();
  }, []);


  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setMember(null);
    setIsCheckedIn(false);
    setShowSearchResults(false);

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`member_id.eq.${searchQuery},nric.eq.${searchQuery},name.ilike.%${searchQuery}%`)
        .limit(5);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: 'Member Not Found', description: 'No member found.', variant: 'destructive' });
        return;
      }
      if (data.length > 1) {
        setSearchResults(data as Member[]);
        setShowSearchResults(true);
      } else {
        await handleMemberSelect(data[0] as Member);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to search member.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberSelect = async (selectedMember: Member) => {
    setMember(selectedMember);
    setShowSearchResults(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: checkInData, error } = await supabase
      .from('check_ins')
      .select('check_in_time')
      .eq('member_id', selectedMember.id)
      .gte('check_in_time', today.toISOString())
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    setIsCheckedIn(!!checkInData);

    // Fetch history for the "Already checked in" message timestamp
    if (checkInData) {
        setCheckInHistory([{ check_in_time: checkInData.check_in_time }]);
    }
  };

  async function handleCheckIn() {
    if (!member || isCheckedIn) return;
    setIsLoading(true);
    try {
      if (member.status === 'suspended') {
        toast({ title: 'Access Denied', description: 'Member is suspended.', variant: 'destructive' });
        return;
      }
      
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({
          member_id: member.id,
          check_in_time: new Date().toISOString(),
          is_grace_period: member.status === 'grace',
          grace_period_charge: member.status === 'grace' ? settings.adult_walk_in_price : null,
          created_by: user!.id,
        });

      if (checkInError) throw checkInError;
      
      if (member.status === 'grace') {
        toast({ title: 'Grace Period Access', description: `Access recorded. Walk-in price: RM ${settings.adult_walk_in_price.toFixed(2)}`, });
      } else {
        toast({ title: 'Success', description: 'Checked in successfully.' });
      }
      await handleMemberSelect(member); // Refresh check-in status
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to check in member.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewHistory = async () => { /* ... existing implementation ... */ };
  const handleRenewMembership = async () => { /* ... existing implementation ... */ };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center sm:text-left">Validate Member</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Enter Member ID, NRIC, or Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLoading}
          className="text-base h-12 px-4 rounded-lg focus:ring-2 focus:ring-primary/50"
          ref={searchInputRef}
        />
        <Button type="submit" disabled={isLoading || !searchQuery.trim()} className="h-12 px-6">
          {isLoading && !member ? <LoadingSpinner size="sm" className="mr-2" /> : 'Search'}
        </Button>
        <Button
            variant="outline"
            type="button"
            onClick={handleReset}
            className="h-12 px-4"
        >
            <X className="h-4 w-4" />
        </Button>
      </form>

      {/* Multiple Search Results Dialog */}
      <Dialog open={showSearchResults} onOpenChange={setShowSearchResults}>
        {/* ... existing Dialog implementation ... */}
      </Dialog>
      
      {/* Member Details Card */}
      {member && (
        <Card className="rounded-2xl shadow-lg overflow-hidden">
          <CardHeader className="p-0 border-0 bg-transparent">
            <div className="flex flex-col md:flex-row items-center gap-6 p-6">
              <div className="flex-shrink-0">
                <img
                  src={memberPhotoUrl || './default-avatar.png'} // Provide a fallback image path
                  alt={member.name}
                  className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-2xl border-4 border-white dark:border-slate-700 shadow-md bg-gray-100"
                  onError={(e) => { e.currentTarget.src = './default-avatar.png'; }} // Fallback if image load fails
                />
              </div>

              <div className="flex-1 w-full text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {member.name}
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                    <Badge
                      variant="outline"
                      className={`${getMemberStatusColor(member.status)} text-xs px-2.5 py-1 rounded-full border-2`}
                    >
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </Badge>
                     <Badge variant="secondary" className="text-xs px-2.5 py-1 rounded-full">
                        {member.membership_type.charAt(0).toUpperCase() + member.membership_type.slice(1)}
                    </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ID: <span className="font-semibold text-gray-800 dark:text-gray-200">{member.member_id}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Valid Until: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(member.end_date)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-4">
              {isCheckedIn ? (
                // CORRECTED: High-contrast "Already checked in" message
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-4 rounded-lg text-lg font-semibold text-center border border-green-200 dark:border-green-800/50">
                  Already checked in today
                  {checkInHistory[0]?.check_in_time && (
                    <span className="block text-sm font-normal mt-1">
                      at {format(new Date(checkInHistory[0].check_in_time), 'hh:mm a')}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleCheckIn}
                    disabled={isLoading || member.status === 'suspended' || member.status === 'expired'}
                    className="flex-1 text-base py-3 h-auto"
                  >
                    {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                    {member.status === 'suspended' ? 'Member Suspended' : member.status === 'expired' ? 'Membership Expired' : 'Check In'}
                  </Button>
                  {member.status === 'grace' && (
                    <div className="text-center text-sm text-yellow-700 dark:text-yellow-300 font-semibold p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md flex-shrink-0">
                      Grace Period Charge: RM {settings.adult_walk_in_price.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        {/* ... existing Dialog implementation ... */}
      </Dialog>

    </div>
  );
};

export default ValidateMemberPage;