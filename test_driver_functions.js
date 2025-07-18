const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDriverFunctions() {
  console.log('🧪 Testing driver accept/reject RPC functions...');
  
  try {
    // Get trips and drivers for testing
    const { data: trips } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'awaiting_driver_acceptance')
      .limit(1);
    
    const { data: drivers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'driver')
      .limit(1);
    
    if (!trips?.length) {
      console.log('⚠️ No trips with awaiting_driver_acceptance status found');
      console.log('Let me create a test scenario...');
      
      // Get a pending trip and assign it to a driver first
      const { data: pendingTrips } = await supabase
        .from('trips')
        .select('*')
        .eq('status', 'upcoming')
        .is('driver_id', null)
        .limit(1);
      
      if (pendingTrips?.length && drivers?.length) {
        const testTrip = pendingTrips[0];
        const testDriver = drivers[0];
        
        console.log(`📋 Found upcoming trip: ${testTrip.id}`);
        console.log(`👤 Using driver: ${testDriver.first_name} ${testDriver.last_name}`);
        
        // First test assign_trip_to_driver
        console.log('\n🔧 Testing assign_trip_to_driver...');
        const { data: assignResult, error: assignError } = await supabase.rpc('assign_trip_to_driver', {
          trip_id: testTrip.id,
          driver_id: testDriver.id
        });
        
        if (assignError) {
          console.error('❌ assign_trip_to_driver failed:', assignError);
          console.error('Full error:', {
            message: assignError.message,
            details: assignError.details,
            hint: assignError.hint,
            code: assignError.code
          });
        } else {
          console.log('✅ assign_trip_to_driver succeeded:', assignResult);
          
          // Check the trip status
          const { data: updatedTrip } = await supabase
            .from('trips')
            .select('status, driver_id')
            .eq('id', testTrip.id)
            .single();
          
          console.log('📊 Trip status after assignment:', updatedTrip?.status);
          console.log('👤 Driver assigned:', updatedTrip?.driver_id);
          
          if (updatedTrip?.status === 'awaiting_driver_acceptance') {
            console.log('\n🧪 Now testing accept_trip...');
            const { data: acceptResult, error: acceptError } = await supabase.rpc('accept_trip', {
              trip_id: testTrip.id,
              driver_id: testDriver.id
            });
            
            if (acceptError) {
              console.error('❌ accept_trip failed:', acceptError);
              console.error('Full error:', {
                message: acceptError.message,
                details: acceptError.details,
                hint: acceptError.hint,
                code: acceptError.code
              });
            } else {
              console.log('✅ accept_trip succeeded:', acceptResult);
              
              // Check status again
              const { data: acceptedTrip } = await supabase
                .from('trips')
                .select('status')
                .eq('id', testTrip.id)
                .single();
              
              console.log('📊 Trip status after acceptance:', acceptedTrip?.status);
            }
          }
        }
      } else {
        console.log('⚠️ No suitable test trips or drivers found');
      }
    } else {
      console.log(`📋 Found ${trips.length} trips with awaiting_driver_acceptance status`);
      
      if (drivers?.length) {
        const testTrip = trips[0];
        const testDriver = drivers[0];
        
        console.log(`🧪 Testing accept_trip with trip ${testTrip.id} and driver ${testDriver.id}`);
        
        const { data: acceptResult, error: acceptError } = await supabase.rpc('accept_trip', {
          trip_id: testTrip.id,
          driver_id: testDriver.id
        });
        
        if (acceptError) {
          console.error('❌ accept_trip failed:', acceptError);
          console.error('Full error:', {
            message: acceptError.message,
            details: acceptError.details,
            hint: acceptError.hint,
            code: acceptError.code
          });
        } else {
          console.log('✅ accept_trip succeeded:', acceptResult);
        }
      }
    }
    
    // Test reject_trip function structure
    console.log('\n🧪 Testing reject_trip function (with invalid params to check structure)...');
    const { data: rejectResult, error: rejectError } = await supabase.rpc('reject_trip', {
      trip_id: '00000000-0000-0000-0000-000000000000',
      driver_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (rejectError) {
      if (rejectError.message.includes('function reject_trip') && rejectError.message.includes('does not exist')) {
        console.log('❌ reject_trip function does not exist in database');
      } else {
        console.log('✅ reject_trip function exists (got expected error for invalid IDs)');
        console.log('Error details:', rejectError.message);
      }
    } else {
      console.log('✅ reject_trip function exists and returned:', rejectResult);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDriverFunctions().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(console.error);