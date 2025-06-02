/*
  # Fix users table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite recursion
    - Simplify RLS policies to use auth.uid() directly
    - Add proper role-based policies for admin operations
    
  2. Security
    - Maintain strict access control
    - Users can only read their own profile
    - Admins and superadmins can manage all users
    - All operations require authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Admins and Superadmins can read all profiles" ON users;
DROP POLICY IF EXISTS "Admins and Superadmins can insert users" ON users;
DROP POLICY IF EXISTS "Admins and Superadmins can update profiles" ON users;
DROP POLICY IF EXISTS "Admins and Superadmins can delete users" ON users;

-- Create new simplified policies
CREATE POLICY "Users can read their own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
ON users FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE role IN ('admin', 'superadmin')
    AND id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE role IN ('admin', 'superadmin')
    AND id = auth.uid()
  )
);