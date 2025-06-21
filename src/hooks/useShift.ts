import { useState, useEffect } from 'react';
import { supabase, Shift } from '../lib/supabase';

export function useShift() {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveShift = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'ACTIVE')
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
    fetchActiveShift();
  }, []);

  return {
    activeShift,
    loading,
    error,
    refreshShift: fetchActiveShift
  };
}