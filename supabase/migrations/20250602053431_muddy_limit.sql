/*
  # Add User Management Functions
  
  1. New Functions
    - `get_accessible_users`: Retrieves users based on admin access level
    - `create_user`: Creates a new user with specified role and permissions
    - `toggle_user_active_status`: Toggles a user's active status
  
  2. Security
    - Functions are only accessible to authenticated users
    - Role-based access control enforced within functions
    - Super admins can access all users
    - Admins can only access non-admin users
    - Users can only access their own data
*/

-- Function to get accessible users based on admin role
CREATE OR REPLACE FUNCTION public.get_accessible_users(admin_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  name text,
  active boolean,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_role text;
BEGIN
  -- Get the role of the requesting admin
  SELECT role INTO admin_role FROM users WHERE id = admin_id;
  
  -- Return users based on admin role
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.role,
    u.name,
    u.active,
    u.last_login_at,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE 
    CASE 
      WHEN admin_role = 'superadmin' THEN true  -- Super admins can see all users
      WHEN admin_role = 'admin' THEN u.role NOT IN ('superadmin', 'admin')  -- Admins can only see non-admin users
      ELSE u.id = admin_id  -- Regular users can only see themselves
    END
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to create a new user
CREATE OR REPLACE FUNCTION public.create_user(
  email text,
  password text,
  role text,
  name text,
  admin_id uuid
)
RETURNS uuid
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_role text;
  new_user_id uuid;
BEGIN
  -- Check admin permissions
  SELECT u.role INTO admin_role FROM users u WHERE u.id = admin_id;
  
  IF admin_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Validate role assignment permissions
  IF (admin_role = 'admin' AND role IN ('admin', 'superadmin')) OR 
     (admin_role = 'superadmin' AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Cannot create user with higher or equal role';
  END IF;

  -- Create auth.users entry first
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    'authenticated',
    role,
    NOW(),
    NOW()
  );

  -- Create public.users entry
  INSERT INTO public.users (
    id,
    email,
    role,
    name,
    active,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    email,
    role,
    name,
    true,
    NOW(),
    NOW()
  );

  RETURN new_user_id;
END;
$$;

-- Function to toggle user active status
CREATE OR REPLACE FUNCTION public.toggle_user_active_status(
  user_id uuid,
  admin_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_role text;
  target_role text;
BEGIN
  -- Get admin and target user roles
  SELECT role INTO admin_role FROM users WHERE id = admin_id;
  SELECT role INTO target_role FROM users WHERE id = user_id;
  
  -- Validate permissions
  IF admin_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF (admin_role = 'admin' AND target_role IN ('admin', 'superadmin')) OR
     (admin_role = 'superadmin' AND target_role = 'superadmin' AND admin_id != user_id) THEN
    RAISE EXCEPTION 'Cannot modify user with higher or equal role';
  END IF;

  -- Toggle active status
  UPDATE users
  SET 
    active = NOT active,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Also update auth.users status
  UPDATE auth.users
  SET 
    disabled = NOT disabled,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_accessible_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user(text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_active_status(uuid, uuid) TO authenticated;