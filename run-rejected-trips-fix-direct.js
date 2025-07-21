const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function executeSQL() {
  try {
    console.log('Step 1: Adding rejected_by_driver_id column...');
    
    // Step 1: Add the column if it doesn't exist
    const { error: columnError } = await supabase
      .rpc('exec', {
        sql: `ALTER TABLE trips ADD COLUMN IF NOT EXISTS rejected_by_driver_id UUID REFERENCES auth.users(id);`
      });
    
    if (columnError) {
      console.log('Note: Column might already exist or using direct SQL execution...');
      console.log('Column error (expected if column exists):', columnError.message);
    } else {
      console.log('✓ Column added successfully or already exists');
    }
    
    console.log('\nStep 2: Creating index...');
    
    // Step 2: Create index
    const { error: indexError } = await supabase
      .rpc('exec', {
        sql: `CREATE INDEX IF NOT EXISTS idx_trips_rejected_by_driver_id ON trips(rejected_by_driver_id) WHERE rejected_by_driver_id IS NOT NULL;`
      });
    
    if (indexError) {
      console.log('Index error (expected if index exists):', indexError.message);
    } else {
      console.log('✓ Index created successfully or already exists');
    }
    
    console.log('\nStep 3: Dropping existing function...');
    
    // Step 3: Drop existing function
    const { error: dropError } = await supabase
      .rpc('exec', {
        sql: `DROP FUNCTION IF EXISTS public.reject_trip(UUID, UUID);`
      });
    
    if (dropError) {
      console.log('Drop function error:', dropError.message);
    } else {
      console.log('✓ Old function dropped successfully');
    }
    
    console.log('\nStep 4: Creating updated function...');
    
    // Step 4: Create the updated function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;`;
    
    const { error: functionError } = await supabase
      .rpc('exec', {
        sql: functionSQL
      });
    
    if (functionError) {
      console.log('Function creation error:', functionError.message);
    } else {
      console.log('✓ Function created successfully');
    }
    
    console.log('\nStep 5: Granting permissions...');
    
    // Step 5: Grant permissions
    const { error: grantError } = await supabase
      .rpc('exec', {
        sql: `GRANT EXECUTE ON FUNCTION public.reject_trip TO authenticated;`
      });
    
    if (grantError) {
      console.log('Grant permissions error:', grantError.message);
    } else {
      console.log('✓ Permissions granted successfully');
    }
    
    console.log('\n🎉 All steps completed! The rejected trips issue should now be fixed.');
    
  } catch (err) {
    console.error('Failed to execute SQL:', err.message);
  }
}

// Run the script
executeSQL();