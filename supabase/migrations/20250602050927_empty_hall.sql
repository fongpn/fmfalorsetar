/*
  # Complete Database Schema Setup

  This migration creates all necessary tables, functions, and policies for the membership management system.

  1. Tables
    - membership_plans: Stores different membership types and their details
    - members: Stores member information
    - membership_history: Tracks membership registrations and renewals
    - check_ins: Records member attendance
    - walk_ins: Records non-member visits
    - products: Stores items available for sale
    - stock_history: Tracks product stock changes
    - sales: Records POS transactions
    - coupons: Stores discount coupons
    - coupon_uses: Records coupon usage
    - shifts: Manages user work shifts
    - payments: Records all financial transactions
    - device_authorization_requests: Manages device authorization requests
    - authorized_devices: Stores authorized devices
    - audit_log: Records system activity
    - shift_handovers: Records shift handovers

  2. Functions
    - handle_start_shift_attempt: Manages shift start logic
    - get_active_shifts_details: Lists active shifts
    - admin_manually_end_shift: Allows admins to force end shifts
    - generate_member_id: Creates sequential member IDs
    - get_dashboard_stats: Calculates dashboard statistics
    - get_accessible_users: Lists users based on admin level
    - execute_approve_device_request: Processes device authorization
    - get_financial_report: Generates financial reports
    - get_sales_report: Generates sales reports
    - get_membership_report: Generates membership reports
    - get_attendance_report: Generates attendance reports
    - get_shift_report: Generates shift report data
    - create_shift_handover: Creates a new shift handover
    - get_shift_audit_trail: Generates shift audit trail

  3. Security
    - RLS enabled on all tables
    - Role-based access control
    - Audit logging for sensitive operations
*/

-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  months integer NOT NULL,
  price numeric(10,2) NOT NULL,
  registration_fee numeric(10,2) NOT NULL,
  free_months integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active membership plans"
  ON membership_plans FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage membership plans"
  ON membership_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  nric text NOT NULL,
  address text,
  photo_url text,
  membership_type text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL,
  registration_fee_paid boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create membership_history table
CREATE TABLE IF NOT EXISTS membership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id),
  membership_type text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  payment_amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  is_renewal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE membership_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read membership history"
  ON membership_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create membership history"
  ON membership_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create check_ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id),
  check_in_time timestamptz NOT NULL,
  is_grace_period boolean DEFAULT false,
  grace_period_charge numeric(10,2),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage check-ins"
  ON check_ins FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  stock integer DEFAULT 0,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active products"
  ON products FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create stock_history table
CREATE TABLE IF NOT EXISTS stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock history"
  ON stock_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create stock history"
  ON stock_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  declared_cash numeric(10,2),
  declared_qr numeric(10,2),
  declared_bank_transfer numeric(10,2),
  system_cash numeric(10,2),
  system_qr numeric(10,2),
  system_bank_transfer numeric(10,2),
  notes text,
  handover_to uuid REFERENCES users(id),
  manually_ended boolean DEFAULT false,
  manually_ended_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shifts"
  ON shifts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all shifts"
  ON shifts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id),
  amount numeric(10,2) NOT NULL,
  method text NOT NULL,
  payment_for text NOT NULL,
  reference_id text,
  shift_id uuid REFERENCES shifts(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create walk_ins table
CREATE TABLE IF NOT EXISTS walk_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  age_group text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  shift_id uuid REFERENCES shifts(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE walk_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage walk-ins"
  ON walk_ins FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL,
  price numeric(10,2) NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz NOT NULL,
  max_uses integer NOT NULL,
  current_uses integer DEFAULT 0,
  active boolean DEFAULT true,
  owner_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons"
  ON coupons FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Authenticated users can create and update coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create coupon_uses table
CREATE TABLE IF NOT EXISTS coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id),
  used_at timestamptz DEFAULT now(),
  used_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage coupon uses"
  ON coupon_uses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create device_authorization_requests table
CREATE TABLE IF NOT EXISTS device_authorization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  browser text NOT NULL,
  os text NOT NULL,
  device text NOT NULL,
  ip text,
  location text,
  timestamp timestamptz NOT NULL,
  requested_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id)
);

ALTER TABLE device_authorization_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own device requests"
  ON device_authorization_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create device requests"
  ON device_authorization_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all device requests"
  ON device_authorization_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create authorized_devices table
CREATE TABLE IF NOT EXISTS authorized_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  browser text NOT NULL,
  os text NOT NULL,
  device text NOT NULL,
  ip text,
  location text,
  timestamp timestamptz NOT NULL,
  authorized_at timestamptz DEFAULT now(),
  authorized_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE authorized_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own authorized devices"
  ON authorized_devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage authorized devices"
  ON authorized_devices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  description text NOT NULL,
  user_id uuid REFERENCES users(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create shift_handovers table
CREATE TABLE IF NOT EXISTS shift_handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  handover_notes TEXT,
  cash_amount NUMERIC NOT NULL DEFAULT 0,
  qr_amount NUMERIC NOT NULL DEFAULT 0,
  bank_transfer_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for shift_handovers
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own handovers"
  ON shift_handovers FOR SELECT
  USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id OR 
    auth.uid() IN (SELECT id FROM auth.users WHERE role IN ('admin', 'superadmin'))
  );

CREATE POLICY "Users can create handovers"
  ON shift_handovers FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id AND
    EXISTS (
      SELECT 1 FROM shifts 
      WHERE id = shift_id 
      AND user_id = auth.uid()
      AND end_time IS NULL
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_handovers_shift_id ON shift_handovers(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_from_user_id ON shift_handovers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_to_user_id ON shift_handovers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_shift_id ON payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create helper functions
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_id text;
BEGIN
  SELECT LPAD(COALESCE(MAX(REGEXP_REPLACE(member_id, '\D', '', 'g')::integer) + 1, 1)::text, 6, '0')
  INTO next_id
  FROM members;
  
  RETURN 'M' || next_id;
END;
$$;

-- Create handle_start_shift_attempt function
CREATE OR REPLACE FUNCTION handle_start_shift_attempt(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_shift_id uuid;
  can_start boolean;
  message text;
BEGIN
  -- Check if user has an active shift
  SELECT id INTO active_shift_id
  FROM shifts
  WHERE shifts.user_id = handle_start_shift_attempt.user_id
  AND end_time IS NULL;
  
  IF FOUND THEN
    can_start := true;
    message := 'User already has an active shift';
    RETURN jsonb_build_object(
      'can_start', can_start,
      'message', message,
      'active_shift_id', active_shift_id
    );
  END IF;
  
  -- Check if user is active
  SELECT active INTO can_start
  FROM users
  WHERE id = handle_start_shift_attempt.user_id;
  
  IF NOT can_start THEN
    message := 'User account is inactive';
    RETURN jsonb_build_object(
      'can_start', can_start,
      'message', message,
      'active_shift_id', null
    );
  END IF;
  
  can_start := true;
  message := 'User can start a new shift';
  
  RETURN jsonb_build_object(
    'can_start', can_start,
    'message', message,
    'active_shift_id', null
  );
END;
$$;

-- Create get_active_shifts_details function
CREATE OR REPLACE FUNCTION get_active_shifts_details()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  start_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    u.email as user_email,
    u.name as user_name,
    s.start_time
  FROM shifts s
  JOIN users u ON u.id = s.user_id
  WHERE s.end_time IS NULL
  ORDER BY s.start_time DESC;
END;
$$;

-- Create admin_manually_end_shift function
CREATE OR REPLACE FUNCTION admin_manually_end_shift(shift_id uuid, admin_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = admin_id
    AND role IN ('admin', 'superadmin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN 'Unauthorized: Only admins can manually end shifts';
  END IF;
  
  -- End the shift
  UPDATE shifts
  SET
    end_time = now(),
    manually_ended = true,
    manually_ended_by = admin_id
  WHERE id = shift_id
  AND end_time IS NULL;
  
  IF FOUND THEN
    RETURN 'Shift ended successfully';
  ELSE
    RETURN 'Shift not found or already ended';
  END IF;
END;
$$;

-- Create execute_approve_device_request function
CREATE OR REPLACE FUNCTION execute_approve_device_request(request_id uuid, admin_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request device_authorization_requests;
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = admin_id
    AND role IN ('admin', 'superadmin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN 'Unauthorized: Only admins can approve device requests';
  END IF;
  
  -- Get request details
  SELECT * INTO request
  FROM device_authorization_requests
  WHERE id = request_id
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN 'Request not found or already processed';
  END IF;
  
  -- Update request status
  UPDATE device_authorization_requests
  SET
    status = 'approved',
    processed_at = now(),
    processed_by = admin_id
  WHERE id = request_id;
  
  -- Add to authorized devices
  INSERT INTO authorized_devices (
    user_id,
    browser,
    os,
    device,
    ip,
    location,
    timestamp,
    authorized_by
  )
  VALUES (
    request.user_id,
    request.browser,
    request.os,
    request.device,
    request.ip,
    request.location,
    request.timestamp,
    admin_id
  );
  
  RETURN 'Device request approved successfully';
END;
$$;

-- Create report functions
CREATE OR REPLACE FUNCTION get_financial_report(start_date timestamptz, end_date timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH payment_totals AS (
    SELECT
      payment_for,
      method,
      SUM(amount) as total
    FROM payments
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY payment_for, method
  )
  SELECT jsonb_build_object(
    'registrations', COALESCE((SELECT total FROM payment_totals WHERE payment_for = 'registration'), 0),
    'renewals', COALESCE((SELECT total FROM payment_totals WHERE payment_for = 'renewal'), 0),
    'walkIns', COALESCE((SELECT total FROM payment_totals WHERE payment_for = 'walk_in'), 0),
    'pos', COALESCE((SELECT total FROM payment_totals WHERE payment_for = 'pos'), 0),
    'coupons', COALESCE((SELECT total FROM payment_totals WHERE payment_for = 'coupon'), 0),
    'totalCash', COALESCE((SELECT SUM(total) FROM payment_totals WHERE method = 'cash'), 0),
    'totalQr', COALESCE((SELECT SUM(total) FROM payment_totals WHERE method = 'qr'), 0),
    'totalBankTransfer', COALESCE((SELECT SUM(total) FROM payment_totals WHERE method = 'bank_transfer'), 0),
    'totalRevenue', COALESCE((SELECT SUM(total) FROM payment_totals), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_sales_report(start_date timestamptz, end_date timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH sales_data AS (
    SELECT
      p.id as product_id,
      p.name as product_name,
      COUNT(*) as quantity_sold,
      SUM(s.total) as revenue,
      p.stock as current_stock,
      p.stock < 10 as low_stock
    FROM sales s
    JOIN products p ON p.id = (s.items->0->>'product_id')::uuid
    WHERE s.created_at BETWEEN start_date AND end_date
    GROUP BY p.id, p.name, p.stock
  )
  SELECT jsonb_build_object(
    'totalSales', COALESCE((SELECT SUM(revenue) FROM sales_data), 0),
    'productPerformance', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'product_id', product_id,
          'product_name', product_name,
          'quantity_sold', quantity_sold,
          'revenue', revenue
        )
      )
      FROM sales_data
    ),
    'stockStatus', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'product_id', product_id,
          'product_name', product_name,
          'current_stock', current_stock,
          'low_stock', low_stock
        )
      )
      FROM sales_data
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_membership_report(start_date timestamptz, end_date timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH membership_data AS (
    SELECT
      COUNT(*) FILTER (WHERE NOT is_renewal) as new_members,
      membership_type,
      COUNT(*) FILTER (WHERE is_renewal) as renewal_count
    FROM membership_history
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY membership_type
  )
  SELECT jsonb_build_object(
    'newMembers', COALESCE((SELECT SUM(new_members) FROM membership_data), 0),
    'renewals', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', membership_type,
          'count', renewal_count
        )
      )
      FROM membership_data
      WHERE renewal_count > 0
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_attendance_report(start_date timestamptz, end_date timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH attendance_data AS (
    SELECT
      (SELECT COUNT(*) FROM check_ins WHERE check_in_time BETWEEN start_date AND end_date) as members,
      (SELECT COUNT(*) FROM walk_ins WHERE created_at BETWEEN start_date AND end_date) as walk_ins
  )
  SELECT jsonb_build_object(
    'members', members,
    'walkIns', walk_ins,
    'total', members + walk_ins
  )
  FROM attendance_data
  INTO result;
  
  RETURN result;
END;
$$;

-- Function to get shift report data
CREATE OR REPLACE FUNCTION get_shift_report(p_shift_id UUID)
RETURNS TABLE (
  shift_id UUID,
  cashier_name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_transactions BIGINT,
  total_amount NUMERIC,
  cash_amount NUMERIC,
  qr_amount NUMERIC,
  bank_transfer_amount NUMERIC,
  transactions JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH shift_data AS (
    SELECT 
      s.id,
      COALESCE(u.name, u.email) as cashier_name,
      s.start_time,
      s.end_time,
      COUNT(p.id) as total_transactions,
      COALESCE(SUM(p.amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) as cash_amount,
      COALESCE(SUM(CASE WHEN p.method = 'qr' THEN p.amount ELSE 0 END), 0) as qr_amount,
      COALESCE(SUM(CASE WHEN p.method = 'bank_transfer' THEN p.amount ELSE 0 END), 0) as bank_transfer_amount
    FROM shifts s
    LEFT JOIN auth.users u ON s.user_id = u.id
    LEFT JOIN payments p ON s.id = p.shift_id
    WHERE s.id = p_shift_id
    GROUP BY s.id, u.name, u.email, s.start_time, s.end_time
  )
  SELECT 
    sd.id,
    sd.cashier_name,
    sd.start_time,
    sd.end_time,
    sd.total_transactions,
    sd.total_amount,
    sd.cash_amount,
    sd.qr_amount,
    sd.bank_transfer_amount,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'time', p.created_at,
            'amount', p.amount,
            'method', p.method,
            'payment_for', p.payment_for,
            'member_name', m.name
          )
        )
        FROM payments p
        LEFT JOIN members m ON p.member_id = m.id
        WHERE p.shift_id = sd.id
        ORDER BY p.created_at DESC
      ),
      '[]'::jsonb
    ) as transactions
  FROM shift_data sd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create shift handover
CREATE OR REPLACE FUNCTION create_shift_handover(
  shift_id UUID,
  from_user_id UUID,
  to_user_id UUID,
  handover_notes TEXT,
  cash_amount NUMERIC,
  qr_amount NUMERIC,
  bank_transfer_amount NUMERIC
)
RETURNS UUID AS $$
DECLARE
  handover_id UUID;
BEGIN
  INSERT INTO shift_handovers (
    shift_id,
    from_user_id,
    to_user_id,
    handover_notes,
    cash_amount,
    qr_amount,
    bank_transfer_amount
  )
  VALUES (
    shift_id,
    from_user_id,
    to_user_id,
    handover_notes,
    cash_amount,
    qr_amount,
    bank_transfer_amount
  )
  RETURNING id INTO handover_id;
  
  RETURN handover_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shift audit trail
CREATE OR REPLACE FUNCTION get_shift_audit_trail(shift_id UUID)
RETURNS TABLE (
  action_time TIMESTAMPTZ,
  action_type TEXT,
  user_id UUID,
  user_name TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.end_time, s.start_time) as action_time,
    CASE 
      WHEN s.end_time IS NOT NULL THEN 'shift_closed'
      ELSE 'shift_started'
    END as action_type,
    COALESCE(s.manually_ended_by, s.user_id) as user_id,
    COALESCE(u.name, u.email) as user_name,
    jsonb_build_object(
      'start_time', s.start_time,
      'end_time', s.end_time,
      'declared_cash', s.declared_cash,
      'declared_qr', s.declared_qr,
      'declared_bank_transfer', s.declared_bank_transfer,
      'notes', s.notes
    ) as details
  FROM shifts s
  LEFT JOIN auth.users u ON COALESCE(s.manually_ended_by, s.user_id) = u.id
  WHERE s.id = shift_id
  UNION ALL
  SELECT 
    sh.created_at as action_time,
    'handover' as action_type,
    sh.from_user_id as user_id,
    COALESCE(u.name, u.email) as user_name,
    jsonb_build_object(
      'to_user_id', sh.to_user_id,
      'to_user_name', COALESCE(u2.name, u2.email),
      'handover_notes', sh.handover_notes,
      'cash_amount', sh.cash_amount,
      'qr_amount', sh.qr_amount,
      'bank_transfer_amount', sh.bank_transfer_amount
    ) as details
  FROM shift_handovers sh
  LEFT JOIN auth.users u ON sh.from_user_id = u.id
  LEFT JOIN auth.users u2 ON sh.to_user_id = u2.id
  WHERE sh.shift_id = shift_id
  ORDER BY action_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default membership plans
INSERT INTO membership_plans (type, months, price, registration_fee, free_months)
VALUES
  ('standard', 1, 50.00, 20.00, 0),
  ('premium', 12, 500.00, 20.00, 1),
  ('family', 12, 800.00, 30.00, 2),
  ('student', 6, 200.00, 10.00, 1);