import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth';

import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import {

  Card,

  CardContent,

  CardDescription,

  CardHeader,

  CardTitle,

} from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import { useToast } from '@/components/ui/use-toast';

import LoadingSpinner from '@/components/ui/loading-spinner';

import { formatDate, formatNRIC, getMemberStatusColor } from '@/lib/utils';

import { History, RefreshCw } from 'lucide-react';

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

  const [statusBackground, setStatusBackground] = useState<string | undefined>(undefined);

  const [searchResults, setSearchResults] = useState<Member[]>([]);

  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  let memberPhotoUrl: string | undefined = undefined;

  if (member && member.photo_url) {

    const { data } = supabase.storage.from('member-photos').getPublicUrl(member.photo_url);

    memberPhotoUrl = data?.publicUrl;

  }



  // Reset handler

  const handleReset = useCallback(() => {

    setMember(null);

    setIsCheckedIn(false);

    setShowHistory(false);

    setCheckInHistory([]);

    setStatusBackground(undefined);

    setSearchQuery('');

    setTimeout(() => {

      searchInputRef.current?.focus();

    }, 0);

  }, []);



  useEffect(() => {

    // Focus search input on mount

    searchInputRef.current?.focus();

  }, []);



  useEffect(() => {

    // Keyboard shortcuts

    const handleKeyDown = (e: KeyboardEvent) => {

      // ESC: Reset and focus search

      if (e.key === 'Escape') {

        e.preventDefault();

        handleReset();

      }

      // CTRL+ENTER: Check-in

      if (e.ctrlKey && e.key === 'Enter' && member && !isCheckedIn) {

        e.preventDefault();

        handleCheckIn();

      }

    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [member, isCheckedIn, handleReset]);



  useEffect(() => {

    // Fetch walk-in price from settings

    const fetchSettings = async () => {

      const { data, error } = await supabase.rpc('get_settings');

      if (!error && data) {

        setSettings({ adult_walk_in_price: (data as any).adult_walk_in_price });

      }

    };

    fetchSettings();

  }, []);



  const handleSearch = async () => {

    if (!searchQuery.trim()) return;

    

    setIsLoading(true);

    setMember(null);

    setIsCheckedIn(false);

    setShowHistory(false);

    setStatusBackground(undefined);

    setSearchResults([]);

    setShowSearchResults(false);



    try {

      // Search by member ID, NRIC, or name

      const { data, error } = await supabase

        .from('members')

        .select('*')

        .or(`member_id.eq.${searchQuery},nric.eq.${searchQuery},name.ilike.%${searchQuery}%`)

        .limit(5);



      if (error) {

        throw error;

      }



      if (!data || data.length === 0) {

        toast({

          title: 'Member Not Found',

          description: 'No member found with the provided ID, NRIC, or name',

          variant: 'destructive',

        });

        return;

      }



      if (data.length > 1) {

        setSearchResults(data as Member[]);

        setShowSearchResults(true);

        return;

      }



      // If only one result, proceed with showing member details

      await handleMemberSelect(data[0] as Member);

    } catch (error) {

      console.error('Error searching member:', error);

      toast({

        title: 'Error',

        description: 'Failed to search member',

        variant: 'destructive',

      });

    } finally {

      setIsLoading(false);

    }

  };



  const handleMemberSelect = async (selectedMember: Member) => {

    setMember(selectedMember);

    setShowSearchResults(false);

    setSearchResults([]);



    // Set status background color

    if (selectedMember.status === 'active') {

      setStatusBackground('bg-green-100');

    } else if (selectedMember.status === 'grace') {

      setStatusBackground('bg-yellow-100');

    } else if (selectedMember.status === 'expired') {

      setStatusBackground('bg-red-100');

    }



    // Check if already checked in today

    const today = new Date();

    today.setHours(0, 0, 0, 0);



    const { data: checkInData, error: checkInError } = await supabase

      .from('check_ins')

      .select('*')

      .eq('member_id', selectedMember.id)

      .gte('check_in_time', today.toISOString())

      .maybeSingle();



    if (checkInError) throw checkInError;

    setIsCheckedIn(!!checkInData);

  };



  const handleCheckIn = async () => {

    if (!member) return;

    setIsLoading(true);

    try {

      // Check if membership is expired or suspended

      if (member.status === 'suspended') {

        toast({

          title: 'Access Denied',

          description: 'Member is suspended',

          variant: 'destructive',

        });

        return;

      }

      const isGracePeriod = member.status === 'grace';

      // Record check-in

      const { error: checkInError } = await supabase

        .from('check_ins')

        .insert({

          member_id: member.id,

          check_in_time: new Date().toISOString(),

          is_grace_period: isGracePeriod,

          grace_period_charge: null,

          created_by: user!.id,

        });

      if (checkInError) throw checkInError;

      // If grace period, record grace period access

      if (isGracePeriod) {

        const { error: graceError } = await (supabase as any)

          .from('grace_period_access')

          .insert({

            member_id: member.id,

            access_date: new Date().toISOString(),

            walk_in_price: settings.adult_walk_in_price,

            created_by: user!.id,

          });

        if (graceError) throw graceError;

        toast({

          title: 'Grace Period Access',

          description: `Access recorded. Walk-in price: RM ${settings.adult_walk_in_price.toFixed(2)}`,

        });

      } else {

        toast({

          title: 'Success',

          description: 'Checked in successfully',

        });

      }

      setIsCheckedIn(true);

    } catch (error) {

      console.error('Error checking in:', error);

      toast({

        title: 'Error',

        description: 'Failed to check in member',

        variant: 'destructive',

      });

    } finally {

      setIsLoading(false);

    }

  };



  const handleViewHistory = async () => {

    if (!member) return;

    setIsLoading(true);

    try {

      const { data, error } = await supabase

        .from('check_ins')

        .select('*, created_by_user:created_by(name)')

        .eq('member_id', member.id)

        .order('check_in_time', { ascending: false })

        .limit(10);



      if (error) throw error;

      setCheckInHistory(data || []);

      setShowHistory(true);

    } catch (error) {

      console.error('Error fetching check-in history:', error);

      toast({

        title: 'Error',

        description: 'Failed to fetch check-in history',

        variant: 'destructive',

      });

    } finally {

      setIsLoading(false);

    }

  };



  const handleRenewMembership = async () => {

    if (!member) return;

    setIsLoading(true);

    try {

      // Get membership plan details

      const { data: planData, error: planError } = await supabase

        .from('membership_plans')

        .select('*')

        .eq('type', member.membership_type)

        .single();



      if (planError) throw planError;



      // Calculate new end date

      const newEndDate = new Date();

      newEndDate.setMonth(newEndDate.getMonth() + planData.months);



      // Update member's end date

      const { error: updateError } = await supabase

        .from('members')

        .update({

          end_date: newEndDate.toISOString(),

          status: 'active',

        })

        .eq('id', member.id);



      if (updateError) throw updateError;



      // Add to membership history

      const { error: historyError } = await supabase

        .from('membership_history')

        .insert({

          member_id: member.id,

          membership_type: member.membership_type,

          start_date: new Date().toISOString(),

          end_date: newEndDate.toISOString(),

          payment_amount: planData.price,

          payment_method: 'cash',

          is_renewal: true,

          created_by: user!.id,

        });



      if (historyError) throw historyError;



      toast({

        title: 'Success',

        description: 'Membership renewed successfully',

      });



      // Refresh member data

      handleSearch();

    } catch (error) {

      console.error('Error renewing membership:', error);

      toast({

        title: 'Error',

        description: 'Failed to renew membership',

        variant: 'destructive',

      });

    } finally {

      setIsLoading(false);

    }

  };



  const handleKeyPress = (e: React.KeyboardEvent) => {

    if (e.key === 'Enter') {

      handleSearch();

    }

  };



  return (

    <div className="space-y-6">

      <h1 className="text-3xl font-bold">Validate Member</h1>



      <div className="flex gap-2 mt-4">

        <Input

          placeholder="Enter Member ID, NRIC, or Name"

          value={searchQuery}

          onChange={(e) => setSearchQuery(e.target.value)}

          onKeyPress={handleKeyPress}

          disabled={isLoading}

          className="max-w-md text-base px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"

          ref={searchInputRef}

        />

        <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()} className="text-sm px-3 py-1.5 h-8 min-w-[80px]">

          {isLoading ? (

            <div className="flex items-center">

              <LoadingSpinner size="sm" className="mr-2" />

              <span>Searching</span>

            </div>

          ) : (

            'Search'

          )}

        </Button>

        <Button

          variant="outline"

          onClick={handleViewHistory}

          disabled={isLoading || !member}

          className="text-sm px-3 py-1.5 h-8 min-w-[80px]"

        >

          <History className="h-4 w-4 mr-2" />

          Check-in History

        </Button>

        <Link href="/checkins" passHref legacyBehavior>

          <Button variant="secondary" className="text-sm px-3 py-1.5 h-8 min-w-[120px]">

            View All Check-ins

          </Button>

        </Link>

      </div>



      {/* Search Results Dialog */}

      <Dialog open={showSearchResults} onOpenChange={setShowSearchResults}>

        <DialogContent className="max-w-2xl">

          <DialogHeader>

            <DialogTitle>Multiple Members Found</DialogTitle>

          </DialogHeader>

          <div className="space-y-4 mt-4">

            {searchResults.map((result) => {

              let photoUrl: string | undefined = undefined;

              if (result.photo_url) {

                const { data } = supabase.storage.from('member-photos').getPublicUrl(result.photo_url);

                photoUrl = data?.publicUrl;

              }

              return (

                <Card

                  key={result.id}

                  className="cursor-pointer hover:bg-gray-50 transition-colors p-0"

                  onClick={() => handleMemberSelect(result)}

                >

                  <CardContent className="p-4">

                    <div className="flex items-center gap-8">

                      {photoUrl ? (

                        <img

                          src={photoUrl}

                          alt={result.name}

                          className="w-[80px] h-[80px] object-cover rounded-2xl border-2 border-white shadow bg-gray-100"

                          style={{ minWidth: 80, minHeight: 80 }}

                        />

                      ) : (

                        <div className="w-[80px] h-[80px] flex items-center justify-center bg-gray-200 rounded-2xl text-gray-400 border-2 border-white shadow" style={{ minWidth: 80, minHeight: 80 }}>

                          No Photo

                        </div>

                      )}

                      <div className="flex-1 w-full">

                        <div className="flex items-center justify-between mb-1">

                          <h3 className="font-semibold text-lg flex items-center gap-2">{result.name}

                            <Badge

                              variant="outline"

                              className={getMemberStatusColor(result.status) + ' text-xs px-2 py-0.5 rounded-full border-2'}

                            >

                              {result.status.charAt(0).toUpperCase() + result.status.slice(1)}

                            </Badge>

                          </h3>

                        </div>

                        <div className="text-sm text-gray-600">

                          Member ID: <span className="font-semibold">{result.member_id}</span>

                        </div>

                      </div>

                    </div>

                  </CardContent>

                </Card>

              );

            })}

          </div>

        </DialogContent>

      </Dialog>



      {member && (

        <Card className={statusBackground + ' p-6 rounded-2xl shadow-xl'}>

          <CardHeader className="p-0 border-0 bg-transparent">

            <div className="flex flex-col md:flex-row items-center gap-8">

              {memberPhotoUrl ? (

                <img

                  src={memberPhotoUrl}

                  alt={member.name}

                  className="w-[220px] h-[220px] object-cover rounded-2xl border-4 border-white shadow-md bg-gray-100"

                  style={{ minWidth: 220, minHeight: 220 }}

                />

              ) : (

                <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-200 rounded-2xl text-gray-400 border-4 border-white shadow-md" style={{ minWidth: 220, minHeight: 220 }}>

                  No Photo

                </div>

              )}

              <div className="flex-1 w-full">

                <div className="flex items-center justify-between mb-1">

                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">

                    {member.name}

                    <Badge

                      variant="outline"

                      className={getMemberStatusColor(member.status) + ' text-xs px-2 py-0.5 rounded-full border-2'}

                    >

                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}

                    </Badge>

                  </h2>

                </div>

                <div className="text-sm text-gray-600 mb-2">

                  Member ID: <span className="font-semibold">{member.member_id}</span>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">

                  <div>

                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Membership Type</div>

                    <div className="text-base font-bold text-gray-800">{member.membership_type.charAt(0).toUpperCase() + member.membership_type.slice(1)}</div>

                  </div>

                  <div>

                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Valid Until</div>

                    <div className="text-base font-bold text-gray-800">{formatDate(member.end_date)}</div>

                  </div>

                </div>

                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-2">

                  {!isCheckedIn && (

                    <Button

                      onClick={handleCheckIn}

                      disabled={isLoading || member.status === 'suspended'}

                      className="flex-1 text-sm py-1.5 h-8 min-w-[100px]"

                    >

                      {isLoading ? (

                        <div className="flex items-center justify-center">

                          <LoadingSpinner size="sm" className="mr-2" />

                          <span>Processing</span>

                        </div>

                      ) : member.status === 'suspended' ? (

                        'Member is Suspended'

                      ) : member.status === 'grace' ? (

                        'Check In (Grace Period - RM 10)'

                      ) : (

                        'Check In'

                      )}

                    </Button>

                  )}

                  <Button

                    variant="outline"

                    onClick={handleRenewMembership}

                    disabled={isLoading}

                    className="flex-1 text-sm py-1.5 h-8 min-w-[100px]"

                  >

                    <RefreshCw className="h-4 w-4 mr-2" />

                    Renew Membership

                  </Button>

                </div>

                {isCheckedIn && (

                  <div className="bg-white text-green-700 border border-green-300 p-4 rounded-lg text-lg font-semibold shadow">

                    Already checked in today

                    {checkInHistory && checkInHistory.length > 0 && (

                      <span>

                        {' '}on {format(new Date(checkInHistory[0].check_in_time), 'dd MMM yyyy')} at {format(new Date(checkInHistory[0].check_in_time), 'hh:mm a')}

                      </span>

                    )}

                  </div>

                )}

              </div>

            </div>

          </CardHeader>

        </Card>

      )}



      {showHistory && checkInHistory.length > 0 && (

        <Card>

          <CardHeader>

            <CardTitle>Check-in History</CardTitle>

          </CardHeader>

          <CardContent>

            <div className="space-y-4">

              {checkInHistory.map((checkIn) => (

                <div

                  key={checkIn.id}

                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"

                >

                  <div>

                    <p className="font-medium">

                      {formatDate(checkIn.check_in_time)}

                    </p>

                    <p className="text-sm text-gray-500">

                      Checked in by: {checkIn.created_by_user?.name}

                    </p>

                  </div>

                  {checkIn.is_grace_period && (

                    <Badge variant="secondary">Grace Period</Badge>

                  )}

                </div>

              ))}

            </div>

          </CardContent>

        </Card>

      )}

    </div>

  );

};



export default ValidateMemberPage;