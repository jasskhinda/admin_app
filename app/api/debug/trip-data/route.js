import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Get a sample of trips to inspect their structure
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .limit(5);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get facility_clients data
    const { data: facilityClients, error: fcError } = await supabase
      .from('facility_clients')
      .select(`
        id,
        facility_id,
        client_id,
        profiles:client_id (
          id, first_name, last_name, full_name, email, phone_number
        )
      `)
      .limit(5);
    
    // Get facilities data
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .limit(5);
    
    return NextResponse.json({
      trips: trips || [],
      facility_clients: facilityClients || [],
      facilities: facilities || [],
      errors: {
        trips: error?.message,
        facility_clients: fcError?.message,
        facilities: facilitiesError?.message
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}