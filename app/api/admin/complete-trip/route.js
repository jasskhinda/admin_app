import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { tripId } = await request.json();
    
    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }
    
    // Verify admin access
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
    
    // Verify trip exists and is in progress
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
      
    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    
    // Check if trip can be completed
    if (!['in_progress', 'upcoming', 'approved'].includes(trip.status)) {
      return NextResponse.json({ 
        error: 'Trip cannot be completed from current status' 
      }, { status: 400 });
    }
    
    console.log(`Completing trip ${tripId}`);
    console.log('Trip data:', { 
      id: trip.id, 
      status: trip.status, 
      driver_id: trip.driver_id,
      pickup_address: trip.pickup_address?.substring(0, 50) + '...'
    });
    
    // Update trip status to completed
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error completing trip:', updateError);
      return NextResponse.json({ 
        error: 'Error completing trip',
        details: updateError.message
      }, { status: 500 });
    }
    
    // Update driver status to available if they were on this trip
    if (trip.driver_id) {
      try {
        await supabase
          .from('profiles')
          .update({ status: 'available' })
          .eq('id', trip.driver_id);
      } catch (error) {
        console.warn('Could not update driver status:', error.message);
      }
    }
    
    console.log(`Successfully completed trip ${tripId}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Trip completed successfully',
      data: {
        tripId,
        completedTrip: updatedTrip
      }
    });
    
  } catch (error) {
    console.error('Error in trip completion:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}