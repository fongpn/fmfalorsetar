/*
  # Create users table and security policies

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `role` (text, default 'cashier')
      - `active` (boolean, default true)
      - `name` (text, nullable)
      - `last_login_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `users` table
    - Add policies for:
      - Users reading their own profile
      - Admins/Superadmins reading all profiles
      - Admins/Superadmins updating profiles
      - Admins/Superadmins inserting new users
      - Admins/Superadmins deleting users
*/

-- Create the users table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    role text DEFAULT 'cashier' NOT NULL,
    active boolean DEFAULT true NOT NULL,
    name text,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
CREATE POLICY "Users can read their own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy for admins/superadmins to read all profiles
CREATE POLICY "Admins and Superadmins can read all profiles"
    ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
        )
    );

-- Policy for admins/superadmins to update profiles
CREATE POLICY "Admins and Superadmins can update profiles"
    ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
        )
    );

-- Policy for admins/superadmins to insert new users
CREATE POLICY "Admins and Superadmins can insert users"
    ON public.users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
        )
    );

-- Policy for admins/superadmins to delete users
CREATE POLICY "Admins and Superadmins can delete users"
    ON public.users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically create user profile after auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'cashier');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();