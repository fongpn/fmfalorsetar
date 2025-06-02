import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit, UserCheck, Ban, History, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, formatNRIC, getMemberStatusColor } from '@/lib/utils';
import type { Member, MembershipHistory } from '@/types';

const MemberDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<MembershipHistory[]>([]);

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        // Fetch member details
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single();

        if (memberError) throw memberError;
        setMember(memberData as Member);

        // Fetch membership history
        const { data: historyData, error: historyError } = await supabase
          .from('membership_history')
          .select('*')
          .eq('member_id', id)
          .order('created_at', { ascending: false });

        if (historyError) throw historyError;
        setHistory(historyData as MembershipHistory[]);
      } catch (error) {
        console.error('Error fetching member details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load member details',
          variant: 'destructive',
        });
        navigate('/members');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberDetails();
  }, [id, navigate, toast]);

  const handleSuspend = async () => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ status: 'suspended' })
        .eq('id', id);

      if (error) throw error;

      setMember(prev => prev ? { ...prev, status: 'suspended' } : null);
      
      toast({
        title: 'Success',
        description: 'Member has been suspended',
      });
    } catch (error) {
      console.error('Error suspending member:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend member',
        variant: 'destructive',
      });
    }
  };

  const handleUnsuspend = async () => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ status: member?.end_date > new Date().toISOString() ? 'active' : 'expired' })
        .eq('id', id);

      if (error) throw error;

      setMember(prev => prev ? {
        ...prev,
        status: prev.end_date > new Date().toISOString() ? 'active' : 'expired'
      } : null);
      
      toast({
        title: 'Success',
        description: 'Member has been unsuspended',
      });
    } catch (error) {
      console.error('Error unsuspending member:', error);
      toast({
        title: 'Error',
        description: 'Failed to unsuspend member',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Member not found</p>
        <Button asChild className="mt-4">
          <Link to="/members">Back to Members</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{member.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Member Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Member ID
                </dt>
                <dd className="text-lg">{member.member_id}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  NRIC
                </dt>
                <dd className="text-lg">{formatNRIC(member.nric)}</dd>
              </div>
              
              {member.email && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </dt>
                  <dd className="text-lg">{member.email}</dd>
                </div>
              )}
              
              {member.phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </dt>
                  <dd className="text-lg">{member.phone}</dd>
                </div>
              )}
              
              {member.address && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Address
                  </dt>
                  <dd className="text-lg">{member.address}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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

              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Start Date
                  </dt>
                  <dd className="text-lg">{formatDate(member.start_date)}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    End Date
                  </dt>
                  <dd className="text-lg">{formatDate(member.end_date)}</dd>
                </div>
              </dl>

              <div className="flex gap-2 mt-6">
                <Button asChild>
                  <Link to={`/members/${id}/edit`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                
                <Button asChild>
                  <Link to={`/members/${id}/renew`}>
                    <History className="w-4 h-4 mr-2" />
                    Renew
                  </Link>
                </Button>
                
                {member.status === 'suspended' ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Unsuspend
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Unsuspend Member</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to unsuspend this member?
                          Their status will be set based on their membership end date.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={handleUnsuspend}>
                          Unsuspend
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Ban className="w-4 h-4 mr-2" />
                        Suspend
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Suspend Member</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to suspend this member?
                          They will not be able to access the facility until unsuspended.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={handleSuspend}>
                          Suspend
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {entry.is_renewal ? 'Renewal' : 'New Registration'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(entry.start_date)} - {formatDate(entry.end_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {entry.membership_type.charAt(0).toUpperCase() + entry.membership_type.slice(1)}
                    </Badge>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Payment: RM {entry.payment_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No history available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberDetailsPage;