import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';
import type { DeviceAuthorizationRequest } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DeviceRequestWithUser extends DeviceAuthorizationRequest {
  users: {
    email: string;
    name: string;
  };
}

const DeviceRequestsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<DeviceRequestWithUser[]>([]);

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
      setRequests(data as DeviceRequestWithUser[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load device requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    try {
      // First get the request details
      const { data: request, error: fetchError } = await supabase
        .from('device_authorization_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update request status
      const { error: updateError } = await supabase
        .from('device_authorization_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user?.id
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add to authorized devices
      const { error: insertError } = await supabase
        .from('authorized_devices')
        .insert({
          user_id: request.user_id,
          browser: request.browser,
          os: request.os,
          device: request.device,
          timestamp: request.timestamp,
          authorized_at: new Date().toISOString(),
          authorized_by: user?.id
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'Device request approved',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
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
          processed_by: user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Device request denied',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({
        title: 'Error',
        description: 'Failed to deny device request',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Device Authorization Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.users?.name || "Unknown"}</div>
                      <div className="text-sm text-gray-500">{request.users?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{request.device}</TableCell>
                  <TableCell>{request.browser}</TableCell>
                  <TableCell>{request.os}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : request.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(request.requested_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeny(request.id)}
                        >
                          Deny
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceRequestsPage;