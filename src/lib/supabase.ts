import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'gym-management-system'
    }
  }
});

// Types for database tables
export interface Profile {
  id: string;
  full_name: string;
  role: 'ADMIN' | 'CS';
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  member_id_string: string;
  full_name: string;
  ic_passport_number?: string;
  phone_number?: string;
  photo_url?: string;
  join_date: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  has_registration_fee: boolean;
  free_months_on_signup: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED';
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  start_time: string;
  end_time?: string;
  starting_staff_id: string;
  ending_staff_id?: string;
  starting_cash_float: number;
  ending_cash_balance?: number;
  system_calculated_cash?: number;
  cash_discrepancy?: number;
  status: 'ACTIVE' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  current_stock: number;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  shift_id: string;
  amount: number;
  payment_method: string;
  type: 'MEMBERSHIP' | 'COUPON_SALE' | 'POS_SALE' | 'WALK_IN' | 'REGISTRATION_FEE';
  // Note: WALK_IN type will be used for both regular and student walk-ins
  // The distinction will be made in the notes field and amount
  related_id?: string;
  processed_by: string;
  status: 'PAID' | 'OUTSTANDING';
  notes?: string;
  created_at: string;
}