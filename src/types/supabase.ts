export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      authorized_devices: {
        Row: {
          authorized_at: string
          authorized_by: string | null
          browser: string
          created_at: string
          device: string
          id: string
          ip: string | null
          location: string | null
          os: string
          timestamp: string
          user_id: string
        }
        Insert: {
          authorized_at?: string
          authorized_by?: string | null
          browser: string
          created_at?: string
          device: string
          id?: string
          ip?: string | null
          location?: string | null
          os: string
          timestamp: string
          user_id: string
        }
        Update: {
          authorized_at?: string
          authorized_by?: string | null
          browser?: string
          created_at?: string
          device?: string
          id?: string
          ip?: string | null
          location?: string | null
          os?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorized_devices_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorized_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      check_ins: {
        Row: {
          check_in_time: string
          created_at: string
          created_by: string
          grace_period_charge: number | null
          id: string
          is_grace_period: boolean
          member_id: string
        }
        Insert: {
          check_in_time?: string
          created_at?: string
          created_by: string
          grace_period_charge?: number | null
          id?: string
          is_grace_period?: boolean
          member_id: string
        }
        Update: {
          check_in_time?: string
          created_at?: string
          created_by?: string
          grace_period_charge?: number | null
          id?: string
          is_grace_period?: boolean
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          used_at: string
          used_by: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          used_at?: string
          used_by: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          used_at?: string
          used_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          current_uses: number
          id: string
          max_uses: number
          owner_name: string
          price: number
          type: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          id?: string
          max_uses: number
          owner_name: string
          price: number
          type: string
          valid_from: string
          valid_to: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          id?: string
          max_uses?: number
          owner_name?: string
          price?: number
          type?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      device_authorization_requests: {
        Row: {
          browser: string
          created_at: string
          device: string
          id: string
          ip: string | null
          location: string | null
          os: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
          timestamp: string
          user_id: string
        }
        Insert: {
          browser: string
          created_at?: string
          device: string
          id?: string
          ip?: string | null
          location?: string | null
          os: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          timestamp: string
          user_id: string
        }
        Update: {
          browser?: string
          created_at?: string
          device?: string
          id?: string
          ip?: string | null
          location?: string | null
          os?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_authorization_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_authorization_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      members: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          email: string | null
          end_date: string
          id: string
          member_id: string
          membership_type: string
          name: string
          notes: string | null
          nric: string
          phone: string | null
          photo_url: string | null
          registration_fee_paid: boolean
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          end_date: string
          id?: string
          member_id?: string
          membership_type: string
          name: string
          notes?: string | null
          nric: string
          phone?: string | null
          photo_url?: string | null
          registration_fee_paid?: boolean
          start_date: string
          status: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          end_date?: string
          id?: string
          member_id?: string
          membership_type?: string
          name?: string
          notes?: string | null
          nric?: string
          phone?: string | null
          photo_url?: string | null
          registration_fee_paid?: boolean
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      membership_history: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          is_renewal: boolean
          member_id: string
          membership_type: string
          payment_amount: number
          payment_method: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          is_renewal?: boolean
          member_id: string
          membership_type: string
          payment_amount: number
          payment_method: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          is_renewal?: boolean
          member_id?: string
          membership_type?: string
          payment_amount?: number
          payment_method?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          created_at: string
          free_months: number
          id: string
          months: number
          price: number
          registration_fee: number
          type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          free_months?: number
          id?: string
          months: number
          price: number
          registration_fee: number
          type: string
        }
        Update: {
          active?: boolean
          created_at?: string
          free_months?: number
          id?: string
          months?: number
          price?: number
          registration_fee?: number
          type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          member_id: string | null
          method: string
          payment_for: string
          reference_id: string | null
          shift_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          member_id?: string | null
          method: string
          payment_for: string
          reference_id?: string | null
          shift_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          member_id?: string | null
          method?: string
          payment_for?: string
          reference_id?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          created_by: string
          id: string
          items: Json
          payment_method: string
          shift_id: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          items: Json
          payment_method: string
          shift_id: string
          total: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          items?: Json
          payment_method?: string
          shift_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          adult_coupon_price: number
          adult_walk_in_price: number
          coupon_max_uses: number
          created_at: string
          default_new_user_role: string
          fingerprinting_enabled: boolean
          fingerprinting_roles: string[]
          id: string
          logo_icon: string | null
          logo_text: string
          logo_url: string | null
          primary_color: string
          updated_at: string
          youth_coupon_price: number
          youth_walk_in_price: number
        }
        Insert: {
          adult_coupon_price?: number
          adult_walk_in_price?: number
          coupon_max_uses?: number
          created_at?: string
          default_new_user_role?: string
          fingerprinting_enabled?: boolean
          fingerprinting_roles?: string[]
          id?: string
          logo_icon?: string | null
          logo_text?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string
          youth_coupon_price?: number
          youth_walk_in_price?: number
        }
        Update: {
          adult_coupon_price?: number
          adult_walk_in_price?: number
          coupon_max_uses?: number
          created_at?: string
          default_new_user_role?: string
          fingerprinting_enabled?: boolean
          fingerprinting_roles?: string[]
          id?: string
          logo_icon?: string | null
          logo_text?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string
          youth_coupon_price?: number
          youth_walk_in_price?: number
        }
        Relationships: []
      }
      shift_stock_counts: {
        Row: {
          created_at: string
          id: string
          product_id: string
          shift_id: string
          system_stock: number
          user_counted_stock: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          shift_id: string
          system_stock: number
          user_counted_stock: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          shift_id?: string
          system_stock?: number
          user_counted_stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_stock_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_stock_counts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          }
        ]
      }
      shifts: {
        Row: {
          created_at: string
          declared_bank_transfer: number | null
          declared_cash: number | null
          declared_qr: number | null
          end_time: string | null
          handover_to: string | null
          id: string
          manually_ended: boolean
          manually_ended_by: string | null
          notes: string | null
          start_time: string
          system_bank_transfer: number | null
          system_cash: number | null
          system_qr: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          declared_bank_transfer?: number | null
          declared_cash?: number | null
          declared_qr?: number | null
          end_time?: string | null
          handover_to?: string | null
          id?: string
          manually_ended?: boolean
          manually_ended_by?: string | null
          notes?: string | null
          start_time?: string
          system_bank_transfer?: number | null
          system_cash?: number | null
          system_qr?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          declared_bank_transfer?: number | null
          declared_cash?: number | null
          declared_qr?: number | null
          end_time?: string | null
          handover_to?: string | null
          id?: string
          manually_ended?: boolean
          manually_ended_by?: string | null
          notes?: string | null
          start_time?: string
          system_bank_transfer?: number | null
          system_cash?: number | null
          system_qr?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_handover_to_fkey"
            columns: ["handover_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_manually_ended_by_fkey"
            columns: ["manually_ended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_history: {
        Row: {
          created_at: string
          created_by: string
          id: string
          new_stock: number
          previous_stock: number
          product_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          new_stock: number
          previous_stock: number
          product_id: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id: string
          last_login_at?: string | null
          name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      walk_ins: {
        Row: {
          age_group: string
          amount: number
          created_at: string
          created_by: string
          id: string
          name: string | null
          payment_method: string
          shift_id: string
        }
        Insert: {
          age_group: string
          amount: number
          created_at?: string
          created_by: string
          id?: string
          name?: string | null
          payment_method: string
          shift_id: string
        }
        Update: {
          age_group?: string
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          name?: string | null
          payment_method?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "walk_ins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_ins_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          type: string
          action: string
          description: string
          user_id: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          action: string
          description: string
          user_id: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          action?: string
          description?: string
          user_id?: string
          metadata?: Json
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
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_manually_end_shift: {
        Args: {
          shift_id: string
          admin_id: string
        }
        Returns: string
      }
      admin_update_user_details: {
        Args: {
          user_id: string
          new_email: string
          new_role: string
          new_name: string
          admin_id: string
        }
        Returns: string
      }
      admin_update_user_password: {
        Args: {
          user_id: string
          new_password: string
          admin_id: string
        }
        Returns: string
      }
      check_user_exists: {
        Args: {
          email: string
        }
        Returns: boolean
      }
      count_check_ins: {
        Args: {
          search_date: string
        }
        Returns: number
      }
      count_coupon_usage: {
        Args: {
          search_date: string
        }
        Returns: number
      }
      create_user: {
        Args: {
          email: string
          password: string
          role: string
          name: string
          admin_id: string
        }
        Returns: string
      }
      execute_approve_device_request: {
        Args: {
          request_id: string
          admin_id: string
        }
        Returns: string
      }
      format_gmt8: {
        Args: {
          timestamp: string
        }
        Returns: string
      }
      generate_member_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_accessible_users: {
        Args: {
          admin_id: string
        }
        Returns: {
          id: string
          email: string
          role: string
          name: string
          active: boolean
          last_login_at: string
        }[]
      }
      get_active_shifts_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          user_email: string
          user_name: string
          start_time: string
        }[]
      }
      get_active_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          name: string
        }[]
      }
      get_settings: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      handle_start_shift_attempt: {
        Args: {
          user_id: string
        }
        Returns: {
          can_start: boolean
          message: string
          active_shift_id: string
        }
      }
      search_check_ins: {
        Args: {
          search_date: string
        }
        Returns: {
          id: string
          member_id: string
          member_name: string
          check_in_time: string
          is_grace_period: boolean
          grace_period_charge: number
        }[]
      }
      search_coupon_usage: {
        Args: {
          search_date: string
        }
        Returns: {
          id: string
          coupon_id: string
          coupon_code: string
          coupon_type: string
          used_at: string
          used_by_name: string
        }[]
      }
      sync_user_active_status: {
        Args: {
          user_id: string
          is_active: boolean
        }
        Returns: boolean
      }
      sync_user_role: {
        Args: {
          user_id: string
          new_role: string
        }
        Returns: boolean
      }
      to_gmt8: {
        Args: {
          timestamp: string
        }
        Returns: string
      }
      toggle_user_active_status: {
        Args: {
          user_id: string
          admin_id: string
        }
        Returns: string
      }
      update_all_settings: {
        Args: {
          settings_json: Json
        }
        Returns: string
      }
      update_coupon_usage: {
        Args: {
          coupon_id: string
          user_id: string
        }
        Returns: number
      }
      update_settings: {
        Args: {
          setting_key: string
          setting_value: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}