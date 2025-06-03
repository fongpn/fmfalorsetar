import { supabase } from './supabase';

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error) return null;
  return data.value;
}

export async function getGracePeriodDays(): Promise<number> {
  const value = await getSetting('grace_period_days');
  return value ? parseInt(value, 10) : 3; // fallback to 3
}

export async function getWalkInRate(): Promise<number> {
  const value = await getSetting('walk_in_rate');
  return value ? parseFloat(value) : 10; // fallback to 10
} 