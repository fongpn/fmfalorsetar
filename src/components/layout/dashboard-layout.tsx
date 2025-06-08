import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShoppingCart,
  ClipboardList,
  BarChart4,
  LogOut,
  Menu,
  X,
  Settings,
  ShieldCheck,
  Ticket,
  Upload,
  Power,
  History,
  Package,
} from 'lucide-react';
import { useAuth, adminRoles } from '@/lib/auth';
import { getActiveShift, startShift } from '@/lib/shifts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import type { AppSettings } from '@/types';

interface DashboardLayoutProps {
  settings: AppSettings | null;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ settings }) => {
  const { user, signOut, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const isAdmin = hasPermission(adminRoles);

  useEffect(() => {
    const checkActiveShift = async () => {
      if (user) {
        const { shift, error } = await getActiveShift(user.id);
        
        if (error) {
          toast({
            title: 'Error',
            description: 'Failed to check shift status',
            variant: 'destructive',
          });
          return;
        }
        
        setHasActiveShift(!!shift);
        
        // If no active shift, start a new one
        if (!shift) {
          const { success, message } = await startShift(user.id);
          
          if (!success) {
            toast({
              title: 'Error Starting Shift',
              description: message,
              variant: 'destructive',
            });
          } else {
            setHasActiveShift(true);
          }
        }
      }
    };
    
    checkActiveShift();
  }, [user, toast]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    if (hasActiveShift) {
      toast({
        title: 'Active Shift',
        description: 'Please end your shift before signing out',
        action: (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => navigate('/end-shift')}
          >
            End Shift
          </Button>
        ),
      });
      return;
    }
    
    try {
      await signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/validate', label: 'Validate', icon: <UserCheck className="h-5 w-5" /> },
    { path: '/members', label: 'Members', icon: <Users className="h-5 w-5" /> },
    { path: '/coupons', label: 'Coupons', icon: <Ticket className="h-5 w-5" /> },
    { path: '/walk-ins', label: 'Walk In', icon: <ClipboardList className="h-5 w-5" /> },
    { path: '/pos', label: 'POS', icon: <ShoppingCart className="h-5 w-5" /> },
    { path: '/reports', label: 'Reports', icon: <BarChart4 className="h-5 w-5" /> },
  ];

  const adminNavItems = [
    { path: '/admin/dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/admin/users', label: 'Users', icon: <Users className="h-5 w-5" /> },
    { path: '/admin/products', label: 'Products', icon: <Package className="h-5 w-5" /> },
    { path: '/admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    { path: '/admin/device-requests', label: 'Device Requests', icon: <ShieldCheck className="h-5 w-5" /> },
    { path: '/admin/import-members', label: 'Import Members', icon: <Upload className="h-5 w-5" /> },
    { path: '/admin/close-shifts', label: 'Close Shifts', icon: <Power className="h-5 w-5" /> },
    { path: '/admin/audit', label: 'Audit Log', icon: <History className="h-5 w-5" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 z-50 border-r border-gray-200 bg-white">
        <div className="flex items-center justify-center h-20 px-6 border-b border-gray-200">
          <Link to="/" className="flex items-center justify-center w-full">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-14 w-auto max-w-[160px] object-contain mx-auto" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
            )}
          </Link>
        </div>
        
        <div className="flex flex-col flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                    ? "bg-gray-100 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}

            {isAdmin && (
              <>
                <Separator className="my-4" />
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin
                </h3>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      location.pathname === item.path || 
                      (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path))
                        ? "bg-gray-100 text-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasActiveShift && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate('/end-shift')}
              >
                End Shift
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className={hasActiveShift ? "w-10" : "flex-1"}
              onClick={handleSignOut}
            >
              {hasActiveShift ? <LogOut className="h-4 w-4" /> : "Sign Out"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-20 px-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-center w-full">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-14 w-auto max-w-[160px] object-contain mx-auto" />
          ) : (
            <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-16">
          <nav className="px-4 py-6 space-y-2">
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-gray-100 text-primary"
                    : "text-gray-700"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}
            
            {isAdmin && (
              <>
                <Separator className="my-4" />
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin
                </h3>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors",
                      location.pathname === item.path
                        ? "bg-gray-100 text-primary"
                        : "text-gray-700"
                    )}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="container mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;