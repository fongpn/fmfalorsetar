/*
  # Create settings table and RPC function

  1. New Tables
    - `settings`
      - `id` (uuid, primary key)
      - `logo_text` (text)
      - `logo_icon` (text)
      - `primary_color` (text)
      - `fingerprinting_enabled` (boolean)
      - `fingerprinting_roles` (text[])
      - `default_new_user_role` (text)
      - `adult_walk_in_price` (numeric)
      - `youth_walk_in_price` (numeric)
      - `adult_coupon_price` (numeric)
      - `youth_coupon_price` (numeric)
      - `coupon_max_uses` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `get_settings()`: Returns the current settings
    - `update_all_settings(settings_json jsonb)`: Updates all settings at once

  3. Security
    - Enable RLS on `settings` table
    - Add policies for authenticated users to read settings
    - Add policies for admin users to update settings
*/

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_text text,
  logo_icon text,
  primary_color text DEFAULT '#0f172a',
  fingerprinting_enabled boolean DEFAULT false,
  fingerprinting_roles text[] DEFAULT ARRAY[]::text[],
  default_new_user_role text DEFAULT 'cashier',
  adult_walk_in_price numeric(10,2) DEFAULT 15.00,
  youth_walk_in_price numeric(10,2) DEFAULT 10.00,
  adult_coupon_price numeric(10,2) DEFAULT 120.00,
  youth_coupon_price numeric(10,2) DEFAULT 80.00,
  coupon_max_uses integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read settings"
  ON settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can update settings"
  ON settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'superadmin')
    )
  );

-- Create get_settings function
CREATE OR REPLACE FUNCTION get_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record settings;
BEGIN
  -- Get first settings record or create one if none exists
  SELECT * INTO settings_record FROM settings LIMIT 1;
  
  IF NOT FOUND THEN
    INSERT INTO settings DEFAULT VALUES RETURNING * INTO settings_record;
  END IF;
  
  RETURN to_jsonb(settings_record) - 'id' - 'created_at' - 'updated_at';
END;
$$;

-- Create update_all_settings function
CREATE OR REPLACE FUNCTION update_all_settings(settings_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record settings;
BEGIN
  -- Check if user has admin privileges
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update settings';
  END IF;

  -- Update first settings record or create one if none exists
  UPDATE settings
  SET
    logo_text = COALESCE(settings_json->>'logo_text', logo_text),
    logo_icon = COALESCE(settings_json->>'logo_icon', logo_icon),
    primary_color = COALESCE(settings_json->>'primary_color', primary_color),
    fingerprinting_enabled = COALESCE((settings_json->>'fingerprinting_enabled')::boolean, fingerprinting_enabled),
    fingerprinting_roles = COALESCE((settings_json->>'fingerprinting_roles')::text[], fingerprinting_roles),
    default_new_user_role = COALESCE(settings_json->>'default_new_user_role', default_new_user_role),
    adult_walk_in_price = COALESCE((settings_json->>'adult_walk_in_price')::numeric, adult_walk_in_price),
    youth_walk_in_price = COALESCE((settings_json->>'youth_walk_in_price')::numeric, youth_walk_in_price),
    adult_coupon_price = COALESCE((settings_json->>'adult_coupon_price')::numeric, adult_coupon_price),
    youth_coupon_price = COALESCE((settings_json->>'youth_coupon_price')::numeric, youth_coupon_price),
    coupon_max_uses = COALESCE((settings_json->>'coupon_max_uses')::integer, coupon_max_uses),
    updated_at = now()
  WHERE id = (SELECT id FROM settings LIMIT 1)
  RETURNING * INTO settings_record;

  IF NOT FOUND THEN
    INSERT INTO settings DEFAULT VALUES RETURNING * INTO settings_record;
  END IF;

  RETURN to_jsonb(settings_record) - 'id' - 'created_at' - 'updated_at';
END;
$$;