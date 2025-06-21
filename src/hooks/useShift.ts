import { useState, useEffect } from 'react';
import { supabase, Shift } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useShift() {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const fetchActiveShift = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only fetch active shift for the current user
      if (!profile?.id) {
        setActiveShift(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          starting_staff_profile:profiles!shifts_starting_staff_id_fkey(full_name)
        `)
        .eq('status', 'ACTIVE')
        .eq('starting_staff_id', profile.id)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setActiveShift(data || null);
    } catch (err: any) {
      setError(err.message);
      setActiveShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchActiveShift();
    } else {
      setActiveShift(null);
      setLoading(false);
    }
  }, [profile?.id]);

  return {
    activeShift,
    loading,
    error,
    refreshShift: fetchActiveShift
  };
}