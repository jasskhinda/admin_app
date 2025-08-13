-- SQL Script to delete user j.khinda@ccgrhc.com
-- Run this in the Supabase SQL Editor

-- First, let's see what we're dealing with
SELECT 'AUTH USERS:' as table_name, id, email, created_at, last_sign_in_at 
FROM auth.users 
WHERE email = 'j.khinda@ccgrhc.com'

UNION ALL

SELECT 'PROFILES:' as table_name, id::text, 
       COALESCE(full_name, 'No name') as email, 
       created_at::text, 
       COALESCE(role, 'No role') as last_sign_in_at
FROM profiles 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'j.khinda@ccgrhc.com'
);

-- If you see the user above and want to delete, uncomment the lines below:

-- Step 1: Delete from profiles table first (to avoid foreign key issues)
-- DELETE FROM profiles 
-- WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'j.khinda@ccgrhc.com'
-- );

-- Step 2: Delete from auth.users table
-- DELETE FROM auth.users 
-- WHERE email = 'j.khinda@ccgrhc.com';

-- Verification query (run after deletion to confirm)
-- SELECT 'Verification - should return no rows:' as status;
-- SELECT * FROM auth.users WHERE email = 'j.khinda@ccgrhc.com';
-- SELECT * FROM profiles WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'j.khinda@ccgrhc.com'
-- );