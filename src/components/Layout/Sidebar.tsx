import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  ShoppingCart,
  Package,
  UserCheck,
  Clock,
  FileText,
  Download,
  Upload,
  Dumbbell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const allNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Check-in', href: '/checkins', icon: UserCheck },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Coupons', href: '/coupons', icon: FileText },
  { name: 'POS & Inventory', href: '/pos', icon: ShoppingCart },
  { name: 'Membership Plans', href: '/plans', icon: CreditCard, adminOnly: true },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Staff Management', href: '/staff', icon: Users, adminOnly: true },
  { name: 'Shifts', href: '/shifts', icon: Clock },
  { name: 'Data Management', href: '/data', icon: Upload, adminOnly: true },
  { name: 'System Settings', href: '/settings', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Filter navigation items based on user role
  const navigation = allNavigation.filter(item => {
    if (item.adminOnly && profile?.role !== 'ADMIN') {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo and Title */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-600 rounded-lg">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">FMF Gym</h1>
            <p className="text-sm text-gray-400">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={(e) => {
              // Ensure navigation works properly
              navigate(item.href);
            }}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );

}