import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { supabase } from '../lib/supabase';
import { memberService } from '../services/memberService';
import { checkinService } from '../services/checkinService';
import { posService } from '../services/posService';
import { Users, DollarSign, CreditCard, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  activeMembers: number;
  todayRevenue: number;
  activeShifts: number;
  todayCheckIns: number;
  expiringMemberships: number;
  lowStockProducts: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeMembers: 0,
    todayRevenue: 0,
    activeShifts: 0,
    todayCheckIns: 0,
    expiringMemberships: 0,
    lowStockProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all members and calculate active/expiring counts
      const allMembers = await memberService.getAllMembers();
      const activeMembers = allMembers.filter(member => member.status === 'ACTIVE').length;
      
      // Count members expiring in next 7 days
      const expiringMembers = allMembers.filter(member => 
        member.status === 'ACTIVE' && 
        member.days_until_expiry !== undefined && 
        member.days_until_expiry <= 7 && 
        member.days_until_expiry >= 0
      ).length;

      // Get today's revenue
      const todayRevenue = await posService.getTodayRevenue();

      // Count active shifts
      const { data: activeShiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('id')
        .eq('status', 'ACTIVE');
      
      if (shiftsError) throw shiftsError;
      const activeShifts = activeShiftsData?.length || 0;

      // Get today's check-ins
      const checkInStats = await checkinService.getCheckInStats();
      const todayCheckIns = checkInStats.total;

      // Get low stock products count
      const lowStockProducts = await posService.getLowStockProducts(10);
      const lowStockCount = lowStockProducts.length;

      setStats({
        activeMembers,
        todayRevenue,
        activeShifts,
        todayCheckIns,
        expiringMemberships: expiringMembers,
        lowStockProducts: lowStockCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Keep default values on error
      setStats({
        activeMembers: 0,
        todayRevenue: 0,
        activeShifts: 0,
        todayCheckIns: 0,
        expiringMemberships: 0,
        lowStockProducts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Active Members',
      value: stats.activeMembers.toLocaleString(),
      icon: Users,
      color: 'bg-orange-500',
      change: '+12 this month',
    },
    {
      title: "Today's Revenue",
      value: `$${stats.todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      change: '+8.2% from yesterday',
    },
    {
      title: 'Active Shifts',
      value: stats.activeShifts.toString(),
      icon: Clock,
      color: 'bg-orange-500',
      change: 'Current shift running',
    },
    {
      title: "Today's Check-ins",
      value: stats.todayCheckIns.toString(),
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+15% from last week',
    },
  ];

  const alertCards = [
    {
      title: 'Expiring Memberships',
      value: stats.expiringMemberships,
      description: 'Members expiring in next 7 days',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Low Stock Products',
      value: stats.lowStockProducts,
      description: 'Products below minimum threshold',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Welcome to FMF Gym Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard" subtitle="Welcome to FMF Gym Management">
      <div className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {alertCards.map((alert, index) => (
            <div key={index} className={`rounded-lg p-6 border ${alert.bgColor} border-gray-200`}>
              <div className="flex items-center">
                <alert.icon className={`h-6 w-6 ${alert.color}`} />
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                  <p className="text-2xl font-bold mt-1">{alert.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center justify-center px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
              <Users className="h-5 w-5 mr-2" />
              New Member
            </button>
            <button className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
              <CreditCard className="h-5 w-5 mr-2" />
              Process Payment
            </button>
            <button className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
              <Clock className="h-5 w-5 mr-2" />
              Start Shift
            </button>
            <button className="flex items-center justify-center px-4 py-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
              <TrendingUp className="h-5 w-5 mr-2" />
              View Reports
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: 'New member registration', member: 'John Smith', time: '5 minutes ago' },
              { action: 'Membership renewal', member: 'Sarah Johnson', time: '12 minutes ago' },
              { action: 'Walk-in check-in', member: 'Guest User', time: '18 minutes ago' },
              { action: 'Product sale', member: 'Mike Wilson', time: '25 minutes ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.member}</p>
                </div>
                <p className="text-xs text-gray-400">{activity.time}</p>
              </div>
            ))}
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    </Layout>
  );
}