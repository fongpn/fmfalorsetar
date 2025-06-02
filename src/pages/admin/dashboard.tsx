import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import {
  Users,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
} from 'lucide-react';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingDeviceRequests: 0,
    activeShifts: 0,
    todayRevenue: 0,
    todayCheckIns: 0,
    todayWalkIns: 0,
    monthlyRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<{
    type: string;
    description: string;
    timestamp: string;
  }[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get active users count
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, active')
          .eq('active', true);

        if (usersError) throw usersError;

        // Get pending device requests
        const { data: deviceData, error: deviceError } = await supabase
          .from('device_authorization_requests')
          .select('id')
          .eq('status', 'pending');

        if (deviceError) throw deviceError;

        // Get active shifts
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('id')
          .is('end_time', null);

        if (shiftsError) throw shiftsError;

        // Get today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: revenueData, error: revenueError } = await supabase
          .from('payments')
          .select('amount')
          .gte('created_at', today.toISOString());

        if (revenueError) throw revenueError;

        // Get today's check-ins
        const { count: checkInsCount, error: checkInsError } = await supabase
          .from('check_ins')
          .select('id', { count: 'exact' })
          .gte('created_at', today.toISOString());

        if (checkInsError) throw checkInsError;

        // Get today's walk-ins
        const { count: walkInsCount, error: walkInsError } = await supabase
          .from('walk_ins')
          .select('id', { count: 'exact' })
          .gte('created_at', today.toISOString());

        if (walkInsError) throw walkInsError;

        // Get recent activity
        const { data: activityData, error: activityError } = await supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (activityError) throw activityError;

        // Calculate total revenue
        const todayRevenue = revenueData.reduce(
          (sum, payment) => sum + payment.amount,
          0
        );

        setStats({
          totalUsers: usersData.length,
          activeUsers: usersData.filter(u => u.active).length,
          pendingDeviceRequests: deviceData.length,
          activeShifts: shiftsData.length,
          todayRevenue,
          todayCheckIns: checkInsCount || 0,
          todayWalkIns: walkInsCount || 0,
          monthlyRevenue: todayRevenue * 30, // Placeholder for actual monthly calculation
        });

        setRecentActivity(
          activityData.map(activity => ({
            type: activity.type,
            description: activity.description,
            timestamp: activity.created_at,
          }))
        );
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-[100px]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Requests</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingDeviceRequests}
            </div>
            <p className="text-xs text-muted-foreground">pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeShifts}</div>
            <p className="text-xs text-muted-foreground">current sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.todayRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              MTD: {formatCurrency(stats.monthlyRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCheckIns}</div>
            <p className="text-xs text-muted-foreground">member visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Walk-ins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayWalkIns}</div>
            <p className="text-xs text-muted-foreground">non-member visits</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <Badge
                      variant={
                        activity.type === 'warning'
                          ? 'destructive'
                          : activity.type === 'success'
                          ? 'default'
                          : 'secondary'
                      }
                      className="mb-1"
                    >
                      {activity.type}
                    </Badge>
                    <p className="text-sm">{activity.description}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;