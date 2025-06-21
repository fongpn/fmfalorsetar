/*
  # FMF Gym Management System - Initial Database Schema

  1. New Tables
    - `system_settings` - Global configuration key-value store
    - `profiles` - Staff account information linked to auth.users
    - `shifts` - Shift management with cash reconciliation
    - `members` - Gym member information with photos
    - `membership_plans` - Admin-defined membership plan templates
    - `memberships` - Individual membership records for tracking
    - `coupon_templates` - Admin-defined coupon templates
    - `sold_coupons` - Individual coupon sales and usage tracking
    - `products` - POS inventory items
    - `stock_movements` - Inventory change history
    - `transactions` - Central financial transaction log
    - `check_ins` - Member and guest entry logging

  2. Security
    - RLS disabled for initial setup (commented policies provided)
    - UUID primary keys for all tables
    - Proper foreign key relationships
    - Timestamps for audit trails

  3. Key Features
    - Shift-based operations requirement
    - Member grace period logic
    - Financial reconciliation tracking
    - Comprehensive audit trails
*/

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'CS')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  starting_staff_id uuid NOT NULL REFERENCES profiles(id),
  ending_staff_id uuid REFERENCES profiles(id),
  starting_cash_float decimal(10,2) NOT NULL DEFAULT 0,
  ending_cash_balance decimal(10,2),
  system_calculated_cash decimal(10,2),
  cash_discrepancy decimal(10,2),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Members Table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id_string text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE,
  phone_number text,
  photo_url text,
  join_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Membership Plans Table
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  duration_months integer NOT NULL,
  has_registration_fee boolean DEFAULT false,
  free_months_on_signup integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES membership_plans(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Coupon Templates Table
CREATE TABLE IF NOT EXISTS coupon_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  max_entries integer NOT NULL,
  duration_days integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sold Coupons Table
CREATE TABLE IF NOT EXISTS sold_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES coupon_templates(id),
  code text UNIQUE NOT NULL,
  member_id uuid REFERENCES members(id),
  purchase_date date DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  entries_remaining integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  current_stock integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  change_quantity integer NOT NULL,
  reason text NOT NULL,
  transaction_id uuid,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id),
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL,
  type text NOT NULL CHECK (type IN ('MEMBERSHIP', 'COUPON_SALE', 'POS_SALE', 'WALK_IN', 'REGISTRATION_FEE')),
  related_id uuid,
  processed_by uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'OUTSTANDING')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Check-ins Table
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id),
  type text NOT NULL CHECK (type IN ('MEMBER', 'COUPON', 'WALK_IN')),
  member_id uuid REFERENCES members(id),
  sold_coupon_id uuid REFERENCES sold_coupons(id),
  processed_by uuid NOT NULL REFERENCES profiles(id),
  check_in_time timestamptz DEFAULT now(),
  notes text
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('grace_period_days', '7', 'Number of days members can access gym after membership expires'),
  ('walk_in_rate', '15.00', 'Daily rate for walk-in gym access'),
  ('registration_fee_default', '25.00', 'Default one-time registration fee for new members')
ON CONFLICT (key) DO NOTHING;

-- Insert sample membership plans
INSERT INTO membership_plans (name, price, duration_months, has_registration_fee, free_months_on_signup) VALUES
  ('Monthly', 45.00, 1, true, 0),
  ('3 Month Package', 120.00, 3, true, 0),
  ('6 Month Package', 210.00, 6, true, 1),
  ('Annual Membership', 360.00, 12, true, 2)
ON CONFLICT DO NOTHING;

-- Insert sample coupon templates
INSERT INTO coupon_templates (name, price, max_entries, duration_days) VALUES
  ('10 Visit Pass', 120.00, 10, 90),
  ('5 Visit Pass', 65.00, 5, 60),
  ('Trial Week Pass', 25.00, 7, 7)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id_string);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_dates ON memberships(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_shift_id ON check_ins(shift_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);

-- Enable RLS (commented out for initial setup)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE coupon_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sold_coupons ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Example RLS Policies (commented out)
/*
-- Admin full access policy example
CREATE POLICY "Admin full access" ON members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

-- CS operational access policy example
CREATE POLICY "CS operational access" ON members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ADMIN', 'CS')
    )
  );
*/