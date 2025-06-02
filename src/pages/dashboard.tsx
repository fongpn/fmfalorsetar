import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

const DashboardPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todayCheckIns: 0,
    todayWalkIns: 0,
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          { count: totalMembers },
          { count: activeMembers },
          { count: todayCheckIns },
          { count: todayWalkIns },
        ] = await Promise.all([
          // Get total members
          supabase
            .from('members')
            .select('*', { count: 'exact', head: true }),

          // Get active members
          supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .gte('end_date', new Date().toISOString()),

          // Get today's check-ins
          supabase
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .gte('check_in_time', today.toISOString()),

          // Get today's walk-ins
          supabase
            .from('walk_ins')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString()),
        ]);
        
        setStats({
          totalMembers: totalMembers || 0,
          activeMembers: activeMembers || 0,
          todayCheckIns: todayCheckIns || 0,
          todayWalkIns: todayWalkIns || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{stats.activeMembers}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{stats.todayCheckIns}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Walk-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{stats.todayWalkIns}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;