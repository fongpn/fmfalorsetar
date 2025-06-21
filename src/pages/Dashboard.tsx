import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { supabase } from '../lib/supabase';
import { memberService } from '../services/memberService';
import { checkinService } from '../services/checkinService'; 
import { posService } from '../services/posService'; 
import { Users, DollarSign, CreditCard, TrendingUp, Clock, UserCheck, ShoppingCart } from 'lucide-react';

interface DashboardStats {
  activeMembers: number;
  todayRevenue: number;
  activeShifts: number;
  todayCheckIns: number;
  expiringMemberships: number;
  lowStockProducts: number;
}

export function Dashboard() {
  const navigate = useNavigate();
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
      // Initialize stats object
      const newStats: DashboardStats = {
        activeMembers: 0,
        todayRevenue: 0,
        activeShifts: 0,
        todayCheckIns: 0,
        expiringMemberships: 0,
        lowStockProducts: 0,
      };

      // Fetch each stat independently with error handling
      try {
        const allMembers = await memberService.getAllMembers();
        newStats.activeMembers = allMembers.filter(member => member.status === 'ACTIVE').length;
        
        // Count members expiring in next 7 days
        newStats.expiringMemberships = allMembers.filter(member => 
          member.status === 'ACTIVE' && 
          member.days_until_expiry !== undefined && 
          member.days_until_expiry <= 7 && 
          member.days_until_expiry >= 0
        ).length;
      } catch (error) {
        console.warn('Error fetching member stats:', error);
      }

      // Get today's revenue
      try {
        newStats.todayRevenue = await posService.getTodayRevenue();
      } catch (error) {
        console.warn('Error fetching revenue stats:', error);
      }

      // Count active shifts
      try {
        const { data: activeShiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('id')
          .eq('status', 'ACTIVE');
        
        if (shiftsError) throw shiftsError;
        newStats.activeShifts = activeShiftsData?.length || 0;
      } catch (error) {
        console.warn('Error fetching shift stats:', error);
      }

      // Get today's check-ins
      try {
        const checkInStats = await checkinService.getCheckInStats();
        newStats.todayCheckIns = checkInStats.total;
      } catch (error) {
        console.warn('Error fetching check-in stats:', error);
      }

      // Get low stock products count
      try {
        const lowStockProducts = await posService.getLowStockProducts(10);
        newStats.lowStockProducts = lowStockProducts.length;
      } catch (error) {
        console.warn('Error fetching stock stats:', error);
      }

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default values on complete failure
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
    },
    {
      title: "Today's Revenue",
      value: `RM${stats.todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Active Shifts',
      value: stats.activeShifts.toString(),
      icon: Clock,
      color: 'bg-orange-500',
    },
    {
      title: "Today's Check-ins",
      value: stats.todayCheckIns.toString(),
      icon: TrendingUp,
      color: 'bg-purple-500',
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

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/checkins')}
              className="flex items-center justify-center px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <UserCheck className="h-5 w-5 mr-2" />
              Check In
            </button>
            <button 
              onClick={() => navigate('/members')}
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Users className="h-5 w-5 mr-2" />
              New Member
            </button>
            <button 
              onClick={() => navigate('/pos')}
              className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              POS
            </button>
            <button 
              onClick={() => navigate('/shifts')}
              className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Clock className="h-5 w-5 mr-2" />
              Start Shift
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}