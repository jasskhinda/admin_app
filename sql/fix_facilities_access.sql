-- Fix facilities access for admin users
-- This script ensures admin users can read all facilities

-- First, let's check if RLS is enabled on facilities table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'facilities' AND schemaname = 'public';

-- Check existing policies on facilities table
SELECT * FROM pg_policies WHERE tablename = 'facilities';

-- Create or update policy to allow admin users to read all facilities
CREATE POLICY IF NOT EXISTS "Admin can read all facilities"
ON public.facilities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create or update policy to allow admin users to insert facilities
CREATE POLICY IF NOT EXISTS "Admin can insert facilities"
ON public.facilities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create or update policy to allow admin users to update facilities
CREATE POLICY IF NOT EXISTS "Admin can update facilities"
ON public.facilities
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create or update policy to allow admin users to delete facilities
CREATE POLICY IF NOT EXISTS "Admin can delete facilities"
ON public.facilities
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Also ensure facilities can read their own data
CREATE POLICY IF NOT EXISTS "Facilities can read own data"
ON public.facilities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'facility'
    AND profiles.facility_id = facilities.id
  )
);

-- Test the policy by showing current user and their role
SELECT 
  auth.uid() as current_user_id,
  profiles.role as current_user_role,
  COUNT(facilities.*) as accessible_facilities
FROM profiles
LEFT JOIN facilities ON true
WHERE profiles.id = auth.uid()
GROUP BY auth.uid(), profiles.role;