-- Check and fix driver roles in the database

-- 1. First, let's see all users and their roles
SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  full_name,
  created_at
FROM profiles
ORDER BY role, created_at DESC;

-- 2. Check specifically for driver role
SELECT COUNT(*) as driver_count 
FROM profiles 
WHERE role = 'driver';

-- 3. Check what roles exist
SELECT DISTINCT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

-- 4. Look for users who might be drivers but have wrong role
-- (e.g., users with vehicle information)
SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  vehicle_model,
  vehicle_license
FROM profiles
WHERE vehicle_model IS NOT NULL 
   OR vehicle_license IS NOT NULL;

-- 5. If you need to update a specific user to be a driver, use this:
-- UPDATE profiles 
-- SET role = 'driver' 
-- WHERE email = 'driver@example.com';

-- 6. To create a test driver if none exist:
-- First, create auth user (this must be done through Supabase Auth)
-- Then update their profile:
/*
UPDATE profiles 
SET 
  role = 'driver',
  first_name = 'Test',
  last_name = 'Driver',
  full_name = 'Test Driver',
  phone_number = '555-0123',
  vehicle_model = 'Toyota Camry',
  vehicle_license = 'ABC123'
WHERE email = 'testdriver@example.com';
*/

-- 7. Check if there are any users that should be drivers based on their email
SELECT 
  id,
  email,
  role,
  first_name,
  last_name
FROM profiles
WHERE LOWER(email) LIKE '%driver%'
   OR LOWER(first_name) LIKE '%driver%'
   OR LOWER(last_name) LIKE '%driver%';

-- 8. View the auth.users table to see all registered users
-- (This might require admin privileges)
/*
SELECT 
  au.id,
  au.email,
  p.role,
  p.first_name,
  p.last_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
*/