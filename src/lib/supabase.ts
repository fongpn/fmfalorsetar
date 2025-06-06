import { createClient } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey);

// Extend the Database type to include audit_log
declare module '@/types/supabase' {
  interface Database {
    public: {
      Tables: {
        audit_log: {
          Row: {
            id: string
            type: string
            description: string
            user_id: string
            metadata: Record<string, any>
            created_at: string
          }
          Insert: {
            id?: string
            type: string
            description: string
            user_id: string
            metadata?: Record<string, any>
            created_at?: string
          }
          Update: {
            id?: string
            type?: string
            description?: string
            user_id?: string
            metadata?: Record<string, any>
            created_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "audit_log_user_id_fkey"
              columns: ["user_id"]
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
        }
      }
    }
  }
}