import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; 
import { useState, useEffect } from 'react';
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
import { settingsService } from '../../services/settingsService';

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
  const [gymName, setGymName] = useState('FMF Gym');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load gym name and logo from settings
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await settingsService.getAllSettings();
        
        if (settings.gym_name) {
          setGymName(settings.gym_name);
        }
        
        if (settings.gym_logo_url) {
          setLogoUrl(settings.gym_logo_url);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

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
        <div className="flex justify-center items-center">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Gym Logo" 
              className="h-16 w-auto object-contain"
            />
          ) : (
            <div className="p-3 bg-orange-600 rounded-lg">
              <Dumbbell className="h-10 w-10" />
            </div>
          )}
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