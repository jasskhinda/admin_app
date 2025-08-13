import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get admin client
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
    }

    // Get all trips - let's first get just basic columns to see what exists
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select('*')
      .limit(1);

    if (tripsError) {
      return NextResponse.json({ error: tripsError.message }, { status: 500 });
    }

    // Show what columns exist for debugging
    const sampleTrip = trips?.[0];
    const availableColumns = sampleTrip ? Object.keys(sampleTrip) : [];

    // Now get all trips with only the columns that exist
    const { data: allTrips, error: allTripsError } = await supabaseAdmin
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (allTripsError) {
      return NextResponse.json({ error: allTripsError.message }, { status: 500 });
    }

    // Get user and facility details separately to avoid relationship issues
    const enrichedTrips = [];
    
    for (const trip of allTrips || []) {
      let userInfo = null;
      let facilityInfo = null;

      // Get user info if user_id exists
      if (trip.user_id) {
        const { data: user } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', trip.user_id)
          .single();
        userInfo = user;
      }

      // Get facility info if facility_id exists
      if (trip.facility_id) {
        const { data: facility } = await supabaseAdmin
          .from('facilities')
          .select('name')
          .eq('id', trip.facility_id)
          .single();
        facilityInfo = facility;
      }

      enrichedTrips.push({
        ...trip,
        user: userInfo,
        facility: facilityInfo
      });
    }

    // Get trip counts by status
    const statusCounts = enrichedTrips.reduce((acc, trip) => {
      acc[trip.status] = (acc[trip.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      trips: enrichedTrips,
      totalTrips: enrichedTrips.length,
      statusCounts,
      availableColumns, // Include this for debugging
      sampleTrip // Include a sample trip to see the structure
    });

  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get admin client
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
    }

    // Get current trip count
    const { count: currentTrips } = await supabaseAdmin
      .from('trips')
      .select('*', { count: 'exact', head: true });

    // Delete all trips
    const { error: deleteError } = await supabaseAdmin
      .from('trips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Verify deletion
    const { count: remainingTrips } = await supabaseAdmin
      .from('trips')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${currentTrips} trips`,
      tripsDeleted: currentTrips,
      remainingTrips: remainingTrips || 0
    });

  } catch (error) {
    console.error('Error deleting trips:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}