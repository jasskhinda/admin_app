-- Fix admin policies for facilities table
-- Only create the policies that don't already exist

-- Skip the read policy since it already exists
-- CREATE POLICY "Admin can read all facilities" already exists

-- Create insert policy for admin users
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

-- Create update policy for admin users
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

-- Create delete policy for admin users
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