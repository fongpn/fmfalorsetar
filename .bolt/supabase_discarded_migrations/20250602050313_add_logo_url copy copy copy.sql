-- Add logo_url column to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS logo_url text;

-- Update the get_settings function to include logo_url
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

-- Update the update_all_settings function to handle logo_url
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
    logo_url = COALESCE(settings_json->>'logo_url', logo_url),
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