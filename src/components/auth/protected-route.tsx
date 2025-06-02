import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { validateDeviceFingerprint } from '@/lib/fingerprint';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, hasPermission } = useAuth();
  const location = useLocation();
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [isDeviceAuthorized, setIsDeviceAuthorized] = useState(true);
  const [authRequestId, setAuthRequestId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkDeviceAuthorization = async () => {
      if (!user) {
        setIsAuthorizing(false);
        return;
      }

      try {
        // Get app settings using Supabase RPC
        const { data: settingsData, error: settingsError } = await supabase
          .rpc('get_settings');
        
        if (settingsError) throw settingsError;
        
        // Skip fingerprinting if disabled or user role is exempt
        if (
          !settingsData?.fingerprinting_enabled ||
          (settingsData?.fingerprinting_roles && 
           !settingsData.fingerprinting_roles.includes(user.role))
        ) {
          setIsDeviceAuthorized(true);
          setIsAuthorizing(false);
          return;
        }

        // Validate device fingerprint
        const result = await validateDeviceFingerprint(user.id);
        
        setIsDeviceAuthorized(result.isAuthorized);
        if (!result.isAuthorized && result.requestId) {
          setAuthRequestId(result.requestId);
        }
      } catch (error) {
        console.error('Error checking device authorization:', error);
        // Default to authorized in case of error to not block users
        setIsDeviceAuthorized(true);
      } finally {
        setIsAuthorizing(false);
      }
    };

    checkDeviceAuthorization();
  }, [user]);

  // Show loading state while checking auth status
  if (isLoading || isAuthorizing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to waiting for approval page if device is not authorized
  if (!isDeviceAuthorized) {
    return (
      <Navigate 
        to="/waiting-for-approval" 
        state={{ requestId: authRequestId }} 
        replace 
      />
    );
  }

  // Check role-based access if required
  if (allowedRoles && !hasPermission(allowedRoles)) {
    return <Navigate to="/\" replace />;
  }

  // Render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;