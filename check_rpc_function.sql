-- Check if assign_trip_to_driver function exists
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    l.lanname as language
FROM pg_proc p
LEFT JOIN pg_language l ON p.prolang = l.oid
WHERE p.proname = 'assign_trip_to_driver'
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- If the function doesn't exist, create it
-- This function should exist from the driver_acceptance_migration.sql
-- But let's ensure it's there with the right logic

-- Create or replace the assign_trip_to_driver function
CREATE OR REPLACE FUNCTION public.assign_trip_to_driver(
  trip_id UUID,
  driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  trip_updated BOOLEAN := FALSE;
BEGIN
  -- Update trip to awaiting driver acceptance
  UPDATE trips 
  SET 
    driver_id = assign_trip_to_driver.driver_id,
    status = 'awaiting_driver_acceptance',
    updated_at = NOW()
  WHERE 
    id = trip_id
    AND (status = 'pending' OR status = 'upcoming');
  
  GET DIAGNOSTICS trip_updated = FOUND;
  RETURN trip_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.assign_trip_to_driver TO authenticated;