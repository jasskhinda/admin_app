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

    // Assign driver to trip
    try {
      const { data: updatedTrip, error: updateError } = await supabase
        .from('trips')
        .update({
          driver_id: driverId,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ Trip assignment failed [${requestId}]:`, updateError);
        throw new Error(`Failed to assign driver: ${updateError.message}`);
      }

      // Update driver status to on_trip
      const { error: driverUpdateError } = await supabase
        .from('profiles')
        .update({ 
          status: 'on_trip',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (driverUpdateError) {
        console.warn(`⚠️ Driver status update failed [${requestId}]:`, driverUpdateError);
        // Don't fail the assignment if driver status update fails
      } else {
        console.log(`✅ Driver status updated to on_trip [${requestId}]: ${driverId}`);
      }

      console.log(`✅ Driver assigned successfully [${requestId}]: ${updatedTrip.id}`);
      
      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        driver: driver,
        message: 'Driver assigned successfully',
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