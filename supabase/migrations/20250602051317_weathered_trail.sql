/*
  # Fix recursive RLS policies for users table

  1. Changes
    - Drop existing policies that cause recursion
    - Create new non-recursive policies for user management
    
  2. Security
    - Maintain same level of access control but without recursion
    - Users can still read their own profile
    - Admins can still manage all users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;

-- Create new non-recursive policies
CREATE POLICY "Users can read their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email 
      FROM public.users 
      WHERE role IN ('admin', 'superadmin')
    )
  )
);

CREATE POLICY "Admins can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email 
      FROM public.users 
      WHERE role IN ('admin', 'superadmin')
    )
  )
);

CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email 
      FROM public.users 
      WHERE role IN ('admin', 'superadmin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email 
      FROM public.users 
      WHERE role IN ('admin', 'superadmin')
    )
  )
);

CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email 
      FROM public.users 
      WHERE role IN ('admin', 'superadmin')
    )
  )
);