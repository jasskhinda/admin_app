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

    // Get all trips with details
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        id,
        status,
        pickup_location,
        destination_location,
        pickup_time,
        created_at,
        user_id,
        facility_id,
        profiles!trips_user_id_fkey(first_name, last_name, email),
        facilities(name)
      `)
      .order('created_at', { ascending: false });

    if (tripsError) {
      return NextResponse.json({ error: tripsError.message }, { status: 500 });
    }

    // Get trip counts by status
    const statusCounts = trips.reduce((acc, trip) => {
      acc[trip.status] = (acc[trip.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      trips: trips || [],
      totalTrips: trips?.length || 0,
      statusCounts
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