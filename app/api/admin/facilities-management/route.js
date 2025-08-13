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

    // Get all facilities
    const { data: facilities, error: facilitiesError } = await supabaseAdmin
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (facilitiesError) {
      return NextResponse.json({ error: facilitiesError.message }, { status: 500 });
    }

    // Get related data counts for each facility
    const facilitiesWithCounts = [];
    
    for (const facility of facilities || []) {
      // Count facility users
      const { count: facilityUsersCount } = await supabaseAdmin
        .from('facility_users')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);

      // Count profiles associated with this facility
      const { count: profilesCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);

      // Count managed clients
      const { count: managedClientsCount } = await supabaseAdmin
        .from('facility_managed_clients')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);

      // Count contracts
      const { count: contractsCount } = await supabaseAdmin
        .from('facility_contracts')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);

      facilitiesWithCounts.push({
        ...facility,
        counts: {
          facilityUsers: facilityUsersCount || 0,
          profiles: profilesCount || 0,
          managedClients: managedClientsCount || 0,
          contracts: contractsCount || 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      facilities: facilitiesWithCounts,
      totalFacilities: facilitiesWithCounts.length
    });

  } catch (error) {
    console.error('Error fetching facilities:', error);
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

    // Get current facility count
    const { count: currentFacilities } = await supabaseAdmin
      .from('facilities')
      .select('*', { count: 'exact', head: true });

    if (!currentFacilities || currentFacilities === 0) {
      return NextResponse.json({
        success: true,
        message: 'No facilities to delete',
        facilitiesDeleted: 0,
        errors: []
      });
    }

    let errors = [];

    // Delete facility-related data first (to avoid foreign key issues)
    console.log('Deleting facility-related data...');

    // Delete facility_users
    const { error: facilityUsersError } = await supabaseAdmin
      .from('facility_users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (facilityUsersError) {
      errors.push({ table: 'facility_users', error: facilityUsersError.message });
    }

    // Delete facility_contracts
    const { error: contractsError } = await supabaseAdmin
      .from('facility_contracts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (contractsError) {
      errors.push({ table: 'facility_contracts', error: contractsError.message });
    }

    // Delete facility_managed_clients
    const { error: managedClientsError } = await supabaseAdmin
      .from('facility_managed_clients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (managedClientsError) {
      errors.push({ table: 'facility_managed_clients', error: managedClientsError.message });
    }

    // Update profiles to remove facility_id references
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .update({ facility_id: null })
      .not('facility_id', 'is', null);

    if (profilesError) {
      errors.push({ table: 'profiles', error: profilesError.message });
    }

    // Finally, delete all facilities
    const { error: facilitiesError } = await supabaseAdmin
      .from('facilities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (facilitiesError) {
      errors.push({ table: 'facilities', error: facilitiesError.message });
      return NextResponse.json({
        success: false,
        message: 'Failed to delete facilities',
        errors
      }, { status: 500 });
    }

    // Verify deletion
    const { count: remainingFacilities } = await supabaseAdmin
      .from('facilities')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${currentFacilities} facilities and all related data`,
      facilitiesDeleted: currentFacilities,
      remainingFacilities: remainingFacilities || 0,
      errors
    });

  } catch (error) {
    console.error('Error deleting facilities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}