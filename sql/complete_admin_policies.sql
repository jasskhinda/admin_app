-- Complete Admin Policies for Admin App
-- This script adds all necessary RLS policies for admin users

-- 1. Admin policies for profiles table
CREATE POLICY IF NOT EXISTS "Admin can view all profiles" 
ON profiles FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY IF NOT EXISTS "Admin can update all profiles" 
ON profiles FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY IF NOT EXISTS "Admin can delete profiles" 
ON profiles FOR DELETE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY IF NOT EXISTS "Admin can insert profiles" 
ON profiles FOR INSERT 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. Admin policies for trips table
CREATE POLICY IF NOT EXISTS "Admin can view all trips" 
ON trips FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY IF NOT EXISTS "Admin can update all trips" 
ON trips FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY IF NOT EXISTS "Admin can delete trips" 
ON trips FOR DELETE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY IF NOT EXISTS "Admin can insert trips" 
ON trips FOR INSERT 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. Admin policies for invoices table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    -- Admin can view all invoices
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can view all invoices" 
    ON invoices FOR SELECT 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
    
    -- Admin can create invoices
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can create invoices" 
    ON invoices FOR INSERT 
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
    
    -- Admin can update invoices
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can update invoices" 
    ON invoices FOR UPDATE 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
    
    -- Admin can delete invoices
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can delete invoices" 
    ON invoices FOR DELETE 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
  END IF;
END $$;

-- 4. Admin policies for facilities table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facilities') THEN
    -- Admin can view all facilities
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can view all facilities" 
    ON facilities FOR SELECT 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
    
    -- Admin can create facilities
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can create facilities" 
    ON facilities FOR INSERT 
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
    
    -- Admin can update facilities
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can update facilities" 
    ON facilities FOR UPDATE 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
    
    -- Admin can delete facilities
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Admin can delete facilities" 
    ON facilities FOR DELETE 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''admin'')';
  END IF;
END $$;