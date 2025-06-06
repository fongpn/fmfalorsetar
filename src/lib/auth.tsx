import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import type { User, UserRole } from '@/types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { validateDeviceFingerprint } from '@/lib/fingerprint';
import type { AppSettings } from '@/types';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => ({ error: 'Not implemented' }),
  signOut: async () => {},
  resetPassword: async () => ({ error: 'Not implemented' }),
  hasPermission: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const lastProcessedUserId = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;
      
      if (session?.user) {
        // Skip if we've already processed this user
        if (lastProcessedUserId.current === session.user.id) {
          setIsLoading(false);
          return;
        }

        // Fetch user data from our users table
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!isMounted) return;
          
        if (error) {
          console.error('Error fetching user:', error);
          await signOut();
        } else if (data) {
          lastProcessedUserId.current = session.user.id;
          setUser(data as User);
        }
      }
      
      if (isMounted) {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only process SIGNED_IN and SIGNED_OUT events
        if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
          return;
        }

        if (!isMounted) return;

        // Skip if we've already processed this user
        if (event === 'SIGNED_IN' && session?.user?.id === lastProcessedUserId.current) {
          return;
        }

        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session) {
          setIsLoading(true);
          console.log('Fetching user data for:', session.user.id);
          // Fetch user data when signed in
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (!isMounted) return;

          if (error) {
            console.error('Error fetching user:', error);
            await signOut();
          } else if (data) {
            console.log('User data fetched:', data);
            // Check if user is active
            if (!data.active) {
              console.log('User account is inactive');
              toast({
                title: 'Account Inactive',
                description: 'Your account has been deactivated. Please contact an administrator.',
                variant: 'destructive',
              });
              await signOut();
              return;
            }
            
            // Get app settings to check if fingerprinting is enabled
            const { data: settings } = await supabase.rpc('get_settings');
            if (!isMounted) return;
            
            console.log('App settings:', settings);
            
            const appSettings = settings as unknown as AppSettings;
            const userRole = data.role as UserRole;
            if (appSettings?.fingerprinting_enabled && 
                appSettings?.fingerprinting_roles?.includes(userRole)) {
              console.log('Device fingerprinting is enabled for role, validating device...');
              // Validate device fingerprint
              const result = await validateDeviceFingerprint(session.user.id);
              if (!isMounted) return;
              
              console.log('Device validation result:', result);
              
              if (!result.isAuthorized) {
                console.log('Device not authorized, redirecting to waiting page');
                navigate('/waiting-for-approval', { 
                  state: { requestId: result.requestId },
                  replace: true 
                });
                return;
              }
            }
            
            console.log('Updating last login time');
            // Update last login time
            await supabase
              .from('users')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', session.user.id);
              
            if (isMounted) {
              lastProcessedUserId.current = session.user.id;
              setUser(data as User);
              console.log('User state updated, redirecting to dashboard');
              navigate('/', { replace: true });
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          lastProcessedUserId.current = null;
          setUser(null);
          navigate('/login');
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate, toast]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear user state
      setUser(null);
      
      // Navigate to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isLoading,
    signIn,
    signOut,
    resetPassword,
    hasPermission,
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const adminRoles: UserRole[] = ['admin', 'superadmin'];
export const cashierRoles: UserRole[] = ['cashier', 'admin', 'superadmin'];
export const superadminRoles: UserRole[] = ['superadmin'];
export const allRoles: UserRole[] = ['cashier', 'admin', 'superadmin'];