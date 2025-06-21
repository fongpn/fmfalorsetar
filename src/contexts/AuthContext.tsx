import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Centralized function to handle authentication state changes
  const handleAuthChange = async (newSession: Session | null) => {
    try {
      setUser(newSession?.user ?? null);
      setSession(newSession);
      
      if (newSession?.user) {
        // Fetch the profile for the authenticated user
        await fetchProfile(newSession.user.id);
      } else {
        // Clear profile when no user is authenticated
        setProfile(null);
      }
    } catch (error) {
      console.error('Error handling auth change:', error);
      // On error, clear all auth state
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initialize authentication state
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session error, clearing auth data:', error.message);
          await supabase.auth.signOut();
          if (mounted) {
            setUser(null);
            setSession(null);
            setProfile(null);
          }
        } else if (mounted) {
          await handleAuthChange(session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event);
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in');
          await handleAuthChange(session);
          break;
        case 'SIGNED_OUT':
          console.log('User signed out');
          await handleAuthChange(null);
          break;
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed successfully');
          if (session) {
            await handleAuthChange(session);
          } else {
            console.warn('Token refresh failed, signing out');
            await supabase.auth.signOut();
            await handleAuthChange(null);
          }
          break;
        case 'USER_UPDATED':
          console.log('User updated');
          if (session) {
            await handleAuthChange(session);
          }
          break;
        default:
          await handleAuthChange(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('Profile fetched successfully:', data?.full_name);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setProfile(null); // Clear any existing profile data
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // The auth state change listener will handle setting user and profile
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // The auth state change listener will handle clearing state
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear local state even if signOut fails
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}