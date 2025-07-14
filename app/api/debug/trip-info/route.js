import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    
    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID required' }, { status: 400 });
    }
    
    // Get trip data
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
      
    if (tripError) {
      return NextResponse.json({ error: 'Trip not found', details: tripError }, { status: 404 });
    }
    
    const debugInfo = {
      trip: trip,
      clientLookups: {}
    };
    
    // Try to find client via different methods
    if (trip.user_id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', trip.user_id)
        .single();
      debugInfo.clientLookups.userProfile = userProfile;
    }
    
    if (trip.managed_client_id) {
      const { data: managedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', trip.managed_client_id)
        .single();
      debugInfo.clientLookups.managedProfile = managedProfile;
      
      const { data: facilityClient } = await supabase
        .from('facility_managed_clients')
        .select('*')
        .eq('id', trip.managed_client_id)
        .single();
      debugInfo.clientLookups.facilityClient = facilityClient;
    }
    
    if (trip.facility_id) {
      const { data: facility } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', trip.facility_id)
        .single();
      debugInfo.facility = facility;
    }
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}