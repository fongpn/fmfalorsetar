import { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster as ShadToaster } from '@/components/ui/toaster'; // Renamed to avoid conflict if you use useToast hook directly
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/types';
import { SettingsProvider } from '@/contexts/SettingsContext';

function AppContent() {
  const { isLoading: authLoading } = useAuth();
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadSettings = async () => {
      // Only load settings if they haven't been loaded yet
      if (settings !== null) {
        setIsSettingsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_settings');
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error loading settings:', error);
          return;
        }

        if (data) {
          const appSettings = data as unknown as AppSettings;
          setSettings(appSettings);
          
          if (appSettings.primary_color) {
            document.documentElement.style.setProperty('--primary-color', appSettings.primary_color);
          }
          
          if (appSettings.logo_text) {
            document.title = appSettings.logo_text;
          }
        }
      } catch (error) {
        console.error('Critical error loading settings:', error);
      } finally {
        if (isMounted) {
          setIsSettingsLoading(false);
        }
      }
    };
    
    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [settings]);

  // Only show loading spinner on initial load
  if (authLoading && isSettingsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/waiting-for-approval" element={<WaitingForApprovalPage />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout settings={settings} />
        </ProtectedRoute>
      }>
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />
        
        {/* Members */}
        <Route path="members">
          <Route index element={<MembersListPage />} />
          <Route path="new" element={<NewMemberPage />} />
          <Route path=":id" element={<MemberDetailsPage />} />
          <Route path=":id/edit" element={<EditMemberPage />} />
          <Route path=":id/renew" element={<RenewMembershipPage />} />
        </Route>
        
        {/* Coupons */}
        <Route path="coupons">
          <Route index element={<CouponsListPage />} />
          <Route path="new" element={<NewCouponPage />} />
          <Route path=":id" element={<CouponDetailsPage />} />
          <Route path=":id/edit" element={<EditCouponPage />} />
        </Route>
        
        {/* Validate */}
        <Route path="validate" element={<ValidateMemberPage />} />
        
        {/* Walk-Ins */}
        <Route path="walk-ins">
          <Route index element={<NewWalkInPage />} />
          <Route path="list" element={<WalkInsListPage />} />
        </Route>
        
        {/* POS */}
        <Route path="pos" element={<POSPage />} />
        
        {/* End Shift */}
        <Route path="end-shift" element={<EndShiftPage />} />
        
        {/* Reports (all users) */}
        <Route path="reports" element={<ReportsPage />} />
        
        {/* Admin Routes */}
        <Route path="admin">
          <Route index element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <Navigate to="/admin/dashboard" replace />
            </ProtectedRoute>
          } />
          <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminDashboardPage /></ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminUsersPage /></ProtectedRoute>
          } />
          <Route path="products/*" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminProductsPage /></ProtectedRoute>
          } />
          <Route path="coupons" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminCouponsPage /></ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminSettingsPage /></ProtectedRoute>
          } />
          <Route path="device-requests" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminDeviceRequestsPage /></ProtectedRoute>
          } />
          <Route path="active-shifts" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminActiveShiftsPage /></ProtectedRoute>
          } />
          <Route path="reports" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminReportsPage /></ProtectedRoute>
          } />
          <Route path="import-members" element={
            <ProtectedRoute allowedRoles={adminRoles}><MemberImportPage /></ProtectedRoute>
          } />
          <Route path="close-shifts" element={
            <ProtectedRoute allowedRoles={adminRoles}><CloseShiftsPage /></ProtectedRoute>
          } />
          <Route path="audit" element={
            <ProtectedRoute allowedRoles={adminRoles}><AdminAuditPage /></ProtectedRoute>
          } />
        </Route>
      </Route>
      
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/\" replace />} />
    </Routes>
  );
}

// Auth Pages
import LoginPage from '@/pages/auth/login';
import ForgotPasswordPage from '@/pages/auth/forgot-password';
import ResetPasswordPage from '@/pages/auth/reset-password';
import WaitingForApprovalPage from '@/pages/auth/waiting-for-approval';

// Layout
import DashboardLayout from '@/components/layout/dashboard-layout';

// Main Pages
import DashboardPage from '@/pages/dashboard';
import MembersListPage from '@/pages/members/list';
import MemberDetailsPage from '@/pages/members/details';
import NewWalkInPage from '@/pages/walk-ins/new';
import WalkInsListPage from '@/pages/walk-ins/list';
import NewMemberPage from '@/pages/members/new';
import EditMemberPage from '@/pages/members/edit';
import RenewMembershipPage from '@/pages/members/renew';
import ValidateMemberPage from '@/pages/validate';
import POSPage from '@/pages/pos';
import EndShiftPage from '@/pages/end-shift';
import ReportsPage from '@/pages/reports';

// Admin Pages
import AdminDashboardPage from '@/pages/admin/dashboard';
import AdminUsersPage from '@/pages/admin/users';
import AdminProductsPage from '@/pages/admin/products';
import AdminCouponsPage from '@/pages/admin/coupons';
import AdminSettingsPage from '@/pages/admin/settings';
import AdminDeviceRequestsPage from '@/pages/admin/device-requests';
import AdminActiveShiftsPage from '@/pages/admin/active-shifts';
import AdminReportsPage from '@/pages/admin/reports';
import MemberImportPage from '@/pages/admin/import-members';
import CloseShiftsPage from '@/pages/admin/close-shifts';
import AdminAuditPage from '@/pages/admin/audit';

// Components
import ProtectedRoute from '@/components/auth/protected-route';
import { adminRoles } from '@/lib/auth'; // cashierRoles was unused, removed for brevity unless needed

// Add imports at the top with other imports
import CouponsListPage from '@/pages/coupons/list';
import NewCouponPage from '@/pages/coupons/new';
import CouponDetailsPage from '@/pages/coupons/details';
import EditCouponPage from '@/pages/coupons/edit';

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppContent />
        <ShadToaster />
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;