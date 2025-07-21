-- Add rejected_by_driver_id column if it doesn't exist
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS rejected_by_driver_id UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_rejected_by_driver_id 
ON trips(rejected_by_driver_id) 
WHERE rejected_by_driver_id IS NOT NULL;

-- Update the reject_trip function to properly set rejected_by_driver_id
DROP FUNCTION IF EXISTS public.reject_trip(UUID, UUID);

CREATE OR REPLACE FUNCTION public.reject_trip(
  trip_id UUID,
  driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  -- Update trip to rejected but keep track of who rejected it
  -- Allow rejection from both awaiting_driver_acceptance and upcoming status
  UPDATE trips t
  SET 
    status = 'rejected',
    driver_id = NULL,  -- Clear assignment so it can be reassigned
    rejected_by_driver_id = reject_trip.driver_id,  -- Track who rejected using the parameter
    updated_at = NOW()
  WHERE 
    t.id = reject_trip.trip_id
    AND t.driver_id = reject_trip.driver_id
    AND t.status IN ('awaiting_driver_acceptance', 'upcoming');
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_trip TO authenticated;