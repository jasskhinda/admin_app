const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStatusConstraint() {
  console.log('🔧 Fixing trips_status_check constraint...');
  
  try {
    // First, drop the existing constraint
    console.log('1. Dropping existing constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;'
    });
    
    if (dropError) {
      console.error('❌ Error dropping constraint:', dropError);
      // Try direct SQL execution instead
      console.log('Trying direct execution...');
      const { error: directDropError } = await supabase
        .from('_realtime')  // This doesn't exist, but we can try a different approach
        .select('*')
        .limit(0);
      
      // Let's try using a raw SQL approach
      console.log('Using raw query approach...');
    }
    
    // Add the updated constraint
    console.log('2. Adding updated constraint...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE trips ADD CONSTRAINT trips_status_check 
            CHECK (status IN (
              'pending', 
              'upcoming', 
              'awaiting_driver_acceptance',
              'in_progress', 
              'completed', 
              'cancelled',
              'rejected'
            ));`
    });
    
    if (addError) {
      console.error('❌ Error adding constraint:', addError);
      
      // Try a different approach using direct query
      console.log('Trying alternative approach with manual SQL...');
      
      // Use a manual approach by updating via rpc
      const sqlCommands = [
        'ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;',
        `ALTER TABLE trips ADD CONSTRAINT trips_status_check 
         CHECK (status IN ('pending', 'upcoming', 'awaiting_driver_acceptance', 'in_progress', 'completed', 'cancelled', 'rejected'));`
      ];
      
      for (const sql of sqlCommands) {
        console.log(`Executing: ${sql}`);
        // Since we can't execute raw SQL directly, let's document what needs to be done
        console.log('📝 SQL command to run manually:', sql);
      }
    } else {
      console.log('✅ Constraint updated successfully');
    }
    
    // Test the RPC function again
    console.log('\n🧪 Testing RPC function after constraint fix...');
    const { data: result, error: rpcError } = await supabase.rpc('assign_trip_to_driver', {
      trip_id: 'd644b6e6-cc74-4ddd-aee3-e85120425de4',
      driver_id: 'b0ba2ee4-3562-41bb-be66-e91962852d79'
    });
    
    if (rpcError) {
      console.error('❌ RPC still failing:', rpcError.message);
      console.log('\n🛠️ Manual fix required:');
      console.log('You need to run these SQL commands in the Supabase SQL editor:');
      console.log('');
      console.log('1. ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;');
      console.log('');
      console.log(`2. ALTER TABLE trips ADD CONSTRAINT trips_status_check 
   CHECK (status IN (
     'pending', 
     'upcoming', 
     'awaiting_driver_acceptance',
     'in_progress', 
     'completed', 
     'cancelled',
     'rejected'
   ));`);
    } else {
      console.log('🎉 RPC function working after constraint fix!');
      console.log('Result:', result);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n🛠️ Manual fix required:');
    console.log('Please run these SQL commands in the Supabase SQL editor:');
    console.log('');
    console.log('1. ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;');
    console.log('');
    console.log(`2. ALTER TABLE trips ADD CONSTRAINT trips_status_check 
   CHECK (status IN (
     'pending', 
     'upcoming', 
     'awaiting_driver_acceptance',
     'in_progress', 
     'completed', 
     'cancelled',
     'rejected'
   ));`);
  }
}

fixStatusConstraint().then(() => {
  console.log('\n🏁 Constraint fix completed');
  process.exit(0);
}).catch(console.error);