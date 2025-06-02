import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/utils';
import { Shield, Check, X } from 'lucide-react';
import type { DeviceAuthRequest } from '@/types';

const DeviceRequestsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<DeviceAuthRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('device_authorization_requests')
          .select(`
            *,
            users!device_authorization_requests_user_id_fkey (
              email,
              name
            )
          `)
          .order('requested_at', { ascending: false });

        if (error) throw error;
        setRequests(data as DeviceAuthRequest[]);
      } catch (error) {
        console.error('Error fetching device requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to load device requests',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();

    // Subscribe to changes
    const subscription = supabase
      .channel('device_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_authorization_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleApprove = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('execute_approve_device_request', {
        request_id: requestId,
        admin_id: user!.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Device request approved',
      });

      // Update will come through subscription
    } catch (error) {
      console.error('Error approving device request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve device request',
        variant: 'destructive',
      });
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('device_authorization_requests')
        .update({
          status: 'denied',
          processed_at: new Date().toISOString(),
          processed_by: user!.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Device request denied',
      });

      // Update will come through subscription
    } catch (error) {
      console.error('Error denying device request:', error);
      toast({
        title: 'Error',
        description: 'Failed to deny device request',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Device Requests</h1>

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
          {requests.map((request) => (
            <Card key={request.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {request.users.name || request.users.email}
                      </h3>
                      <Badge
                        variant={
                          request.status === 'pending'
                            ? 'outline'
                            : request.status === 'approved'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {request.browser} on {request.os} ({request.device})
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Requested: {formatDateTime(request.requested_at)}
                    </p>
                    {request.processed_at && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Processed: {formatDateTime(request.processed_at)}
                      </p>
                    )}
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeny(request.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {requests.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No device requests found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeviceRequestsPage;