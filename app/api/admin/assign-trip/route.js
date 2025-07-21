import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { tripId, driverId } = await request.json();
    
    if (!tripId || !driverId) {
      return NextResponse.json({ error: 'Trip ID and Driver ID required' }, { status: 400 });
    }
    
    // Verify admin/dispatcher access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || !['admin', 'dispatcher'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify trip exists and is available for assignment
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
      
    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    
    // Check if trip is already assigned
    if (trip.driver_id) {
      return NextResponse.json({ 
        error: 'Trip is already assigned to another driver' 
      }, { status: 400 });
    }
    
    // Check if trip status allows assignment
    if (!['pending', 'approved', 'confirmed', 'upcoming'].includes(trip.status)) {
      return NextResponse.json({ 
        error: 'Trip status does not allow assignment' 
      }, { status: 400 });
    }
    
    // Verify driver exists and is available
    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', driverId)
      .eq('role', 'driver')
      .single();
      
    if (driverError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    // Check if driver is available (not on another trip at the same time)
    if (trip.pickup_time) {
      const { data: conflictingTrips } = await supabase
        .from('trips')
        .select('id')
        .eq('driver_id', driverId)
        .in('status', ['confirmed', 'in_progress'])
        .gte('pickup_time', new Date(trip.pickup_time).toISOString())
        .lte('pickup_time', new Date(new Date(trip.pickup_time).getTime() + 4 * 60 * 60 * 1000).toISOString()); // 4 hour window
        
      if (conflictingTrips && conflictingTrips.length > 0) {
        return NextResponse.json({ 
          error: 'Driver has conflicting trips at this time' 
        }, { status: 400 });
      }
    }
    
    console.log(`Assigning trip ${tripId} to driver ${driverId}`);
    console.log('Trip data:', { 
      id: trip.id, 
      status: trip.status, 
      driver_id: trip.driver_id,
      user_id: trip.user_id,
      managed_client_id: trip.managed_client_id,
      facility_id: trip.facility_id
    });
    
    // Assign the trip to the driver - use valid status values only
    const updateData = {
      driver_id: driverId,
      updated_at: new Date().toISOString()
    };
    
    // Set status to awaiting_driver_acceptance when assigning a driver
    // This ensures the driver has to accept the trip before it becomes active
    if (['pending', 'upcoming'].includes(trip.status)) {
      updateData.status = 'awaiting_driver_acceptance';
    }
    
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error assigning trip:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({ 
        error: 'Error assigning trip',
        details: updateError.message,
        code: updateError.code 
      }, { status: 500 });
    }
    
    // Optionally update driver status to indicate they're on a trip
    try {
      await supabase
        .from('profiles')
        .update({ status: 'on_trip' })
        .eq('id', driverId);
    } catch (error) {
      console.warn('Could not update driver status:', error.message);
    }
    
    console.log(`Successfully assigned trip ${tripId} to driver ${driverId}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Trip successfully assigned',
      data: {
        tripId,
        driverId,
        assignedTrip: updatedTrip
      }
    });
    
  } catch (error) {
    console.error('Error in trip assignment:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}