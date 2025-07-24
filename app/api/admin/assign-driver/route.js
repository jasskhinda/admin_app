import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 Admin assign driver API called [${requestId}] at ${new Date().toISOString()}`);
  
  try {
    // Parse request body
    let body, tripId, driverId;
    try {
      body = await request.json();
      ({ tripId, driverId } = body);
      console.log(`📦 Request [${requestId}]:`, { 
        tripId: tripId?.substring(0, 8) + '...', 
        driverId: driverId?.substring(0, 8) + '...'
      });
    } catch (parseError) {
      console.error(`❌ JSON parse error [${requestId}]:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError.message,
        requestId 
      }, { status: 400 });
    }
    
    if (!tripId || !driverId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Both tripId and driverId are required',
        received: { tripId: !!tripId, driverId: !!driverId },
        requestId 
      }, { status: 400 });
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get and verify session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error(`❌ Authentication error [${requestId}]:`, userError);
      return NextResponse.json({
        error: 'Authentication required',
        details: 'Please log in to perform this action',
        requestId
      }, { status: 401 });
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(`❌ Profile error [${requestId}]:`, profileError);
      return NextResponse.json({
        error: 'Profile verification failed',
        details: profileError?.message || 'Profile not found',
        requestId
      }, { status: 403 });
    }

    if (profile.role !== 'admin') {
      console.error(`❌ Invalid role [${requestId}]: ${profile.role}`);
      return NextResponse.json({ 
        error: 'Access denied',
        details: `Admin role required. Current role: ${profile.role}`,
        requestId 
      }, { status: 403 });
    }

    console.log(`✅ Admin verified [${requestId}]: ${profile.first_name} ${profile.last_name}`);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError) {
      console.error(`❌ Trip query error [${requestId}]:`, tripError);
      if (tripError.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Trip not found',
          details: `No trip exists with ID: ${tripId}`,
          requestId
        }, { status: 404 });
      }
      return NextResponse.json({
        error: 'Database query failed',
        details: tripError.message,
        requestId
      }, { status: 500 });
    }

    if (!trip) {
      console.error(`❌ No trip data returned [${requestId}]`);
      return NextResponse.json({
        error: 'Trip not found',
        details: `No trip found with ID: ${tripId}`,
        requestId
      }, { status: 404 });
    }

    // Verify driver exists and is available
    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, status, role')
      .eq('id', driverId)
      .eq('role', 'driver')
      .single();

    if (driverError) {
      console.error(`❌ Driver query error [${requestId}]:`, driverError);
      if (driverError.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Driver not found',
          details: `No driver exists with ID: ${driverId}`,
          requestId
        }, { status: 404 });
      }
      return NextResponse.json({
        error: 'Database query failed',
        details: driverError.message,
        requestId
      }, { status: 500 });
    }

    if (!driver) {
      console.error(`❌ No driver data returned [${requestId}]`);
      return NextResponse.json({
        error: 'Driver not found',
        details: `No driver found with ID: ${driverId}`,
        requestId
      }, { status: 404 });
    }

    console.log(`✅ Driver found [${requestId}]: ${driver.first_name} ${driver.last_name} - Status: ${driver.status}`);

    // Check if trip can be assigned
    const allowedStatuses = ['upcoming', 'pending'];
    if (!allowedStatuses.includes(trip.status)) {
      return NextResponse.json({
        error: 'Invalid trip status',
        details: `Cannot assign driver to trip in status: ${trip.status}. Allowed statuses: ${allowedStatuses.join(', ')}`,
        currentStatus: trip.status,
        allowedStatuses,
        requestId
      }, { status: 400 });
    }

    // Assign driver to trip using the new function
    try {
      console.log(`🔧 Calling assign_trip_to_driver RPC [${requestId}] with params:`, {
        trip_id: tripId?.substring(0, 8) + '...',
        driver_id: driverId?.substring(0, 8) + '...'
      });

      const { data: functionResult, error: functionError } = await supabase
        .rpc('assign_trip_to_driver', {
          trip_id: tripId,
          driver_id: driverId
        });

      console.log(`🔍 RPC function result [${requestId}]:`, { 
        result: functionResult, 
        hasError: !!functionError 
      });

      if (functionError) {
        console.error(`❌ Trip assignment function failed [${requestId}]:`, {
          message: functionError.message,
          details: functionError.details,
          hint: functionError.hint,
          code: functionError.code
        });
        throw new Error(`Failed to assign driver: ${functionError.message}`);
      }

      if (!functionResult) {
        console.error(`❌ RPC function returned false [${requestId}] - no trip was updated`);
        throw new Error('Failed to assign driver - no trip was updated (function returned false)');
      }

      // Get the updated trip
      const { data: updatedTrip, error: tripFetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripFetchError) {
        console.error(`❌ Failed to fetch updated trip [${requestId}]:`, tripFetchError);
        throw new Error(`Failed to fetch updated trip: ${tripFetchError.message}`);
      }

      // Note: Driver status can be managed separately if needed
      // For now, we'll let the driver acceptance workflow handle status updates

      console.log(`✅ Driver assigned successfully [${requestId}]: ${updatedTrip.id}`);
      
      // Send email notification to driver
      try {
        console.log(`🔍 Attempting to send email notification [${requestId}]`);
        console.log(`🔍 Driver details [${requestId}]:`, {
          driverId: driverId?.substring(0, 8) + '...',
          driverName: `${driver.first_name} ${driver.last_name}`,
          driverRole: driver.role
        });
        
        // Get driver email from profiles
        const { data: driverWithEmail, error: emailError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', driverId)
          .single();

        console.log(`📋 Driver email query result [${requestId}]:`, {
          hasData: !!driverWithEmail,
          email: driverWithEmail?.email ? `${driverWithEmail.email.substring(0, 3)}***` : 'none',
          error: emailError?.message
        });

        if (driverWithEmail?.email) {
          console.log(`📧 Preparing to send email [${requestId}]`);
          console.log(`🔍 Trip ID being used for email link [${requestId}]: ${tripId}`);
          const { sendDriverAssignmentEmail } = await import('@/lib/emailService');
          
          // Prepare driver info with email
          const driverInfoWithEmail = {
            ...driver,
            email: driverWithEmail.email
          };
          
          // Prepare trip info for email
          const tripInfo = {
            pickup_time: updatedTrip.pickup_time,
            pickup_location: updatedTrip.pickup_location,
            dropoff_location: updatedTrip.dropoff_location,
            client_name: updatedTrip.client_name,
            client_phone: updatedTrip.client_phone,
            special_instructions: updatedTrip.special_instructions,
            total_cost: updatedTrip.total_cost,
            is_emergency: updatedTrip.is_emergency
          };
          
          console.log(`📬 Sending email to driver [${requestId}]:`, {
            to: driverInfoWithEmail.email.substring(0, 3) + '***',
            hasPickupTime: !!tripInfo.pickup_time,
            hasLocations: !!(tripInfo.pickup_location && tripInfo.dropoff_location)
          });
          
          // Send the email with trip ID for driver app link
          const emailResult = await sendDriverAssignmentEmail(driverInfoWithEmail, tripInfo, tripId);
          console.log(`✅ Email sent successfully [${requestId}]:`, {
            messageId: emailResult.messageId,
            recipient: emailResult.recipient?.substring(0, 3) + '***'
          });
        } else {
          console.warn(`⚠️ No email found for driver [${requestId}] - driverWithEmail:`, driverWithEmail);
        }
      } catch (emailError) {
        console.error(`❌ Failed to send email notification [${requestId}]:`, {
          message: emailError.message,
          stack: emailError.stack,
          name: emailError.name
        });
        // Don't fail the assignment if email fails - just log the error
      }
      
      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        driver: driver,
        message: 'Driver assigned successfully. Email notification sent.',
        details: {
          previousStatus: trip.status,
          newStatus: updatedTrip.status,
          driverName: `${driver.first_name} ${driver.last_name}`,
          requestId
        }
      });

    } catch (error) {
      console.error(`❌ Error in driver assignment [${requestId}]:`, error);
      throw error;
    }

  } catch (error) {
    console.error(`🚨 Unhandled error [${requestId}]:`, error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}