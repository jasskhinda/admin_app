-- Create Riverside Medical Center facility
INSERT INTO public.facilities (
  id,
  name,
  address,
  phone_number,
  contact_email,
  billing_email,
  facility_type,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Riverside Medical Center',
  '620 E Broad St, Columbus, OH 43215',
  '(614) 555-7320',
  'admin@riversidemedical.com',
  'billing@riversidemedical.com',
  'hospital',
  'active',
  now(),
  now()
);

-- Get the facility ID for the next step
SELECT id, name, contact_email FROM public.facilities WHERE name = 'Riverside Medical Center';

-- Create the auth user (you'll need to use the Supabase Auth Admin API for this)
-- For now, let's just create the profile record with a placeholder user ID
-- You can update this later when the user is created through the auth system