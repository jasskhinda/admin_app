import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    const results = {};
    
    // Check what tables exist and their structure
    const tablesToCheck = [
      'trips',
      'facility_clients', 
      'profiles',
      'facilities',
      'trip_clients',
      'bookings',
      'passengers'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        // Try to get a sample record to see the structure
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          results[tableName] = { error: error.message, exists: false };
        } else {
          results[tableName] = { 
            exists: true, 
            sample_structure: data?.[0] ? Object.keys(data[0]) : [],
            sample_data: data?.[0] || null
          };
        }
      } catch (err) {
        results[tableName] = { error: err.message, exists: false };
      }
    }
    
    // Also try to get a specific facility trip with any possible relationships
    try {
      const { data: facilityTrip } = await supabase
        .from('trips')
        .select(`
          *,
          facilities(*),
          profiles(*)
        `)
        .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3')
        .limit(1)
        .single();
      
      results.facility_trip_with_joins = facilityTrip;
    } catch (err) {
      results.facility_trip_with_joins = { error: err.message };
    }
    
    return NextResponse.json(results);
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}