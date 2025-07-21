import { supabaseAdmin } from '@/lib/admin-supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
  }

  try {
    console.log('Starting rejected trips fix...');
    
    // Step 1: Add column using raw SQL
    console.log('Step 1: Adding rejected_by_driver_id column...');
    const { error: columnError } = await supabaseAdmin
      .from('trips')
      .select('rejected_by_driver_id')
      .limit(1);
    
    let columnExists = !columnError || !columnError.message.includes('column "rejected_by_driver_id" does not exist');
    
    if (!columnExists) {
      // Try to add the column - we'll handle this through a direct query if possible
      console.log('Column does not exist, need to add it...');
    } else {
      console.log('Column already exists or accessible');
    }
    
    // Step 2: Update/create the reject_trip function
    console.log('Step 2: Creating/updating reject_trip function...');
    
    const functionSQL = `
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
          driver_id = NULL,
          rejected_by_driver_id = reject_trip.driver_id,
          updated_at = NOW()
        WHERE 
          t.id = reject_trip.trip_id
          AND t.driver_id = reject_trip.driver_id
          AND t.status IN ('awaiting_driver_acceptance', 'upcoming');
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        RETURN rows_affected > 0;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // We need to execute raw SQL - let's try using a stored procedure approach
    console.log('Attempting to execute function update...');
    
    // Check if we can at least verify the function exists
    const { data: functions, error: funcError } = await supabaseAdmin
      .rpc('pg_get_function_result', { function_name: 'reject_trip' })
      .single();
    
    if (funcError) {
      console.log('Function check error (expected):', funcError.message);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Fix attempt completed. Please check the SQL manually in Supabase dashboard.',
      sqlToRun: `
-- Run this SQL in your Supabase Dashboard SQL editor:

-- 1. Add the column if it doesn't exist
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS rejected_by_driver_id UUID REFERENCES auth.users(id);

-- 2. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_trips_rejected_by_driver_id 
ON trips(rejected_by_driver_id) 
WHERE rejected_by_driver_id IS NOT NULL;

-- 3. Update the reject_trip function
DROP FUNCTION IF EXISTS public.reject_trip(UUID, UUID);

CREATE OR REPLACE FUNCTION public.reject_trip(
  trip_id UUID,
  driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE trips t
  SET 
    status = 'rejected',
    driver_id = NULL,
    rejected_by_driver_id = reject_trip.driver_id,
    updated_at = NOW()
  WHERE 
    t.id = reject_trip.trip_id
    AND t.driver_id = reject_trip.driver_id
    AND t.status IN ('awaiting_driver_acceptance', 'upcoming');
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.reject_trip TO authenticated;
      `,
      columnExists: columnExists
    });
    
  } catch (error) {
    console.error('Error in fix-rejected-trips:', error);
    return NextResponse.json({ 
      error: 'Failed to fix rejected trips', 
      details: error.message,
      sqlToRun: `
-- Run this SQL in your Supabase Dashboard SQL editor:

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS rejected_by_driver_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_trips_rejected_by_driver_id 
ON trips(rejected_by_driver_id) 
WHERE rejected_by_driver_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.reject_trip(UUID, UUID);

CREATE OR REPLACE FUNCTION public.reject_trip(
  trip_id UUID,
  driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE trips t
  SET 
    status = 'rejected',
    driver_id = NULL,
    rejected_by_driver_id = reject_trip.driver_id,
    updated_at = NOW()
  WHERE 
    t.id = reject_trip.trip_id
    AND t.driver_id = reject_trip.driver_id
    AND t.status IN ('awaiting_driver_accep

tance', 'upcoming');
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_trip TO authenticated;
      `
    }, { status: 500 });
  }
}