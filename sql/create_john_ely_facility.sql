-- Step 1: Create John Ely Facility
INSERT INTO public.facilities (
  id,
  name,
  address,
  phone_number,
  contact_email,
  billing_email,
  facility_type,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'John Ely Facility',
  '5050 Blazer Pkwy # 100, Dublin, OH 43017',
  '(555) 123-8888',
  'john.ely@ccgrhc.com',
  'john.ely@ccgrhc.com',
  'assisted_living',
  now(),
  now()
);

-- Step 2: Get the facility ID
SELECT id, name, contact_email FROM public.facilities WHERE name = 'John Ely Facility';

-- Step 3: After creating the user in Supabase Auth, update their profile
-- You'll need to:
-- 1. Go to Supabase Auth dashboard
-- 2. Create user with email: john.ely@ccgrhc.com and password: JohnFacility@123
-- 3. Get the user ID
-- 4. Run this query with the actual user ID:

/*
UPDATE public.profiles 
SET 
  email = 'john.ely@ccgrhc.com',
  role = 'facility',
  facility_id = 'FACILITY_ID_FROM_STEP_2',
  first_name = 'John Ely Facility',
  last_name = 'Facility',
  phone_number = '(555) 123-8888',
  updated_at = now()
WHERE id = 'USER_ID_FROM_AUTH';
*/