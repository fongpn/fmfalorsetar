/*
  # Disable RLS on users table for development

  1. Changes
    - Temporarily disable RLS on users table for development purposes
    - Drop existing policies on users table to prevent conflicts

  2. Security Note
    - This is a temporary change for development only
    - RLS should be re-enabled and proper policies reinstated before production deployment
*/

-- Drop existing policies to prevent any conflicts
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;