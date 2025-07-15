import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Get all upcoming trips
    const { data: upcomingTrips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'upcoming')
      .order('created_at', { ascending: false })
      .limit(10);
      
    // Also get all trips to see what's available
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, status, user_id, managed_client_id')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (tripsError) {
      return NextResponse.json({ error: 'Failed to fetch trips', details: tripsError }, { status: 500 });
    }
    
    const debugData = {
      totalUpcomingTrips: upcomingTrips?.length || 0,
      allTripsError: allTripsError?.message,
      allTrips: allTrips || [],
      trips: []
    };
    
    // For each trip, try to fetch client data
    for (const trip of upcomingTrips) {
      const tripDebug = {
        tripId: trip.id,
        user_id: trip.user_id,
        managed_client_id: trip.managed_client_id,
        facility_id: trip.facility_id,
        bill_to: trip.bill_to,
        clientLookups: {}
      };
      
      // Try user_id lookup
      if (trip.user_id) {
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, email, phone_number, role')
          .eq('id', trip.user_id)
          .single();
          
        tripDebug.clientLookups.userProfile = {
          success: !userError,
          data: userProfile,
          error: userError?.message
        };
      }
      
      // Try managed_client_id lookup
      if (trip.managed_client_id) {
        const { data: managedProfile, error: managedError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, email, phone_number, role')
          .eq('id', trip.managed_client_id)
          .single();
          
        tripDebug.clientLookups.managedProfile = {
          success: !managedError,
          data: managedProfile,
          error: managedError?.message
        };
        
        // Also try facility_managed_clients if it's a facility trip
        if (trip.facility_id) {
          const { data: facilityClient, error: facilityError } = await supabase
            .from('facility_managed_clients')
            .select('id, first_name, last_name, email, phone_number')
            .eq('id', trip.managed_client_id)
            .single();
            
          tripDebug.clientLookups.facilityClient = {
            success: !facilityError,
            data: facilityClient,
            error: facilityError?.message
          };
        }
      }
      
      debugData.trips.push(tripDebug);
    }
    
    return NextResponse.json(debugData);
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}