import { useState } from 'react';
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
import type { Member } from '@/types';

const ValidateMemberPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setMember(null);
    setIsCheckedIn(false);

    try {
      // Search by member ID or NRIC
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`member_id.eq.${searchQuery},nric.eq.${searchQuery}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: 'Member Not Found',
            description: 'No member found with the provided ID or NRIC',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      setMember(data as Member);

      // Check if already checked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('member_id', data.id)
        .gte('check_in_time', today.toISOString())
        .maybeSingle();

      if (checkInError) throw checkInError;
      setIsCheckedIn(!!checkInData);
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
      const gracePeriodCharge = isGracePeriod ? 10 : null; // Example grace period charge

      // Record check-in
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({
          member_id: member.id,
          check_in_time: new Date().toISOString(),
          is_grace_period: isGracePeriod,
          grace_period_charge: gracePeriodCharge,
          created_by: user!.id,
        });

      if (checkInError) throw checkInError;

      // If grace period, record payment
      if (isGracePeriod && gracePeriodCharge) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            member_id: member.id,
            amount: gracePeriodCharge,
            method: 'cash',
            payment_for: 'grace_period',
            created_by: user!.id,
          });

        if (paymentError) throw paymentError;
      }

      setIsCheckedIn(true);
      toast({
        title: 'Success',
        description: isGracePeriod
          ? `Checked in with grace period charge: RM ${gracePeriodCharge}`
          : 'Checked in successfully',
      });
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Validate Member</h1>

      <div className="flex gap-2">
        <Input
          placeholder="Enter Member ID or NRIC"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className="max-w-md"
        />
        <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
          {isLoading ? (
            <div className="flex items-center">
              <LoadingSpinner size="sm\" className="mr-2" />
              <span>Searching</span>
            </div>
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {member && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{member.name}</span>
              <Badge
                variant="outline"
                className={getMemberStatusColor(member.status)}
              >
                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
              </Badge>
            </CardTitle>
            <CardDescription>
              Member ID: {member.member_id} • NRIC: {formatNRIC(member.nric)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Membership Type
                  </dt>
                  <dd className="text-lg">
                    {member.membership_type.charAt(0).toUpperCase() + member.membership_type.slice(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Valid Until
                  </dt>
                  <dd className="text-lg">{formatDate(member.end_date)}</dd>
                </div>
              </dl>

              {isCheckedIn ? (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-lg">
                  Already checked in today
                </div>
              ) : (
                <Button
                  onClick={handleCheckIn}
                  disabled={isLoading || member.status === 'suspended'}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm\" className="mr-2" />
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidateMemberPage;