import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    
    if (!facilityId) {
      return NextResponse.json({ error: 'Facility ID required' }, { status: 400 });
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
      
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get admin client for user deletion
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    // Check if facility exists
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', facilityId)
      .single();
      
    if (facilityError || !facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }
    
    // 1. Check for active facility admin users
    const { data: facilityAdmins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('facility_id', facilityId)
      .eq('role', 'facility');
      
    if (adminsError) {
      console.error('Error checking facility admins:', adminsError);
      return NextResponse.json({ error: 'Error checking facility administrators' }, { status: 500 });
    }
    
    // 2. Check for facility clients
    const { data: facilityClients, error: clientsError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('facility_id', facilityId)
      .eq('role', 'client');
      
    if (clientsError) {
      console.error('Error checking facility clients:', clientsError);
      return NextResponse.json({ error: 'Error checking facility clients' }, { status: 500 });
    }
    
    // 3. Check for managed clients
    const { data: managedClients, error: managedError } = await supabase
      .from('facility_managed_clients')
      .select('id, email, first_name, last_name')
      .eq('facility_id', facilityId);
      
    if (managedError) {
      console.error('Error checking managed clients:', managedError);
      return NextResponse.json({ error: 'Error checking managed clients' }, { status: 500 });
    }
    
    // 4. Check for pending or upcoming trips for any facility clients
    const now = new Date().toISOString();
    let allFacilityUserIds = [];
    
    if (facilityClients && facilityClients.length > 0) {
      allFacilityUserIds = facilityClients.map(client => client.id);
    }
    
    if (allFacilityUserIds.length > 0) {
      const { data: pendingTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id, status, pickup_datetime, user_id')
        .in('user_id', allFacilityUserIds)
        .or(`status.eq.pending,status.eq.confirmed,status.eq.in_progress,pickup_datetime.gte.${now}`);
        
      if (tripsError) {
        console.error('Error checking trips:', tripsError);
        return NextResponse.json({ error: 'Error checking facility trips' }, { status: 500 });
      }
      
      if (pendingTrips && pendingTrips.length > 0) {
        const upcomingCount = pendingTrips.filter(trip => new Date(trip.pickup_datetime) > new Date()).length;
        const pendingCount = pendingTrips.filter(trip => ['pending', 'confirmed', 'in_progress'].includes(trip.status)).length;
        
        return NextResponse.json({ 
          error: 'Cannot delete facility with clients who have pending or upcoming trips',
          details: {
            facilityClients: facilityClients.length,
            pendingTrips: pendingCount,
            upcomingTrips: upcomingCount,
            totalBlockingTrips: pendingTrips.length
          }
        }, { status: 400 });
      }
    }
    
    // 5. Check for pending invoices for facility clients
    if (allFacilityUserIds.length > 0) {
      const { data: pendingInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, status, total, user_id')
        .in('user_id', allFacilityUserIds)
        .in('status', ['pending', 'overdue']);
        
      if (invoicesError) {
        console.error('Error checking invoices:', invoicesError);
        return NextResponse.json({ error: 'Error checking facility invoices' }, { status: 500 });
      }
      
      if (pendingInvoices && pendingInvoices.length > 0) {
        const totalOwed = pendingInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        
        return NextResponse.json({ 
          error: 'Cannot delete facility with clients who have pending bills',
          details: {
            facilityClients: facilityClients.length,
            pendingInvoices: pendingInvoices.length,
            totalOwed: totalOwed
          }
        }, { status: 400 });
      }
    }
    
    // 6. Begin deletion process
    console.log(`Starting deletion process for facility: ${facilityId}`);
    
    const deletionSummary = {
      facilityAdminsDeleted: 0,
      facilityClientsDeleted: 0,
      managedClientsDeleted: 0,
      tripsDeleted: 0,
      invoicesDeleted: 0
    };
    
    // Delete all facility-related data in proper order
    
    // Delete trips for facility clients
    if (allFacilityUserIds.length > 0) {
      const { error: tripsDeleteError, count: tripsCount } = await supabase
        .from('trips')
        .delete({ count: 'exact' })
        .in('user_id', allFacilityUserIds);
        
      if (tripsDeleteError) {
        console.error('Error deleting facility trips:', tripsDeleteError);
        return NextResponse.json({ error: 'Error deleting facility trips' }, { status: 500 });
      }
      deletionSummary.tripsDeleted = tripsCount || 0;
    }
    
    // Delete invoices for facility clients
    if (allFacilityUserIds.length > 0) {
      const { error: invoicesDeleteError, count: invoicesCount } = await supabase
        .from('invoices')
        .delete({ count: 'exact' })
        .in('user_id', allFacilityUserIds);
        
      if (invoicesDeleteError) {
        console.error('Error deleting facility invoices:', invoicesDeleteError);
        return NextResponse.json({ error: 'Error deleting facility invoices' }, { status: 500 });
      }
      deletionSummary.invoicesDeleted = invoicesCount || 0;
    }
    
    // Delete managed clients
    if (managedClients && managedClients.length > 0) {
      const { error: managedDeleteError, count: managedCount } = await supabase
        .from('facility_managed_clients')
        .delete({ count: 'exact' })
        .eq('facility_id', facilityId);
        
      if (managedDeleteError) {
        console.error('Error deleting managed clients:', managedDeleteError);
        return NextResponse.json({ error: 'Error deleting managed clients' }, { status: 500 });
      }
      deletionSummary.managedClientsDeleted = managedCount || 0;
    }
    
    // Delete facility client profiles
    if (facilityClients && facilityClients.length > 0) {
      const { error: clientProfilesError, count: clientsCount } = await supabase
        .from('profiles')
        .delete({ count: 'exact' })
        .eq('facility_id', facilityId)
        .eq('role', 'client');
        
      if (clientProfilesError) {
        console.error('Error deleting facility client profiles:', clientProfilesError);
        return NextResponse.json({ error: 'Error deleting facility client profiles' }, { status: 500 });
      }
      deletionSummary.facilityClientsDeleted = clientsCount || 0;
      
      // Delete auth users for facility clients
      for (const client of facilityClients) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(client.id);
        } catch (authError) {
          console.warn(`Could not delete auth user for client ${client.id}:`, authError);
        }
      }
    }
    
    // Delete facility admin profiles
    if (facilityAdmins && facilityAdmins.length > 0) {
      const { error: adminProfilesError, count: adminsCount } = await supabase
        .from('profiles')
        .delete({ count: 'exact' })
        .eq('facility_id', facilityId)
        .eq('role', 'facility');
        
      if (adminProfilesError) {
        console.error('Error deleting facility admin profiles:', adminProfilesError);
        return NextResponse.json({ error: 'Error deleting facility admin profiles' }, { status: 500 });
      }
      deletionSummary.facilityAdminsDeleted = adminsCount || 0;
      
      // Delete auth users for facility admins
      for (const admin of facilityAdmins) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(admin.id);
        } catch (authError) {
          console.warn(`Could not delete auth user for admin ${admin.id}:`, authError);
        }
      }
    }
    
    // Finally, delete the facility itself
    const { error: facilityDeleteError } = await supabase
      .from('facilities')
      .delete()
      .eq('id', facilityId);
      
    if (facilityDeleteError) {
      console.error('Error deleting facility:', facilityDeleteError);
      return NextResponse.json({ error: 'Error deleting facility record' }, { status: 500 });
    }
    
    console.log(`Successfully deleted facility: ${facilityId}`, deletionSummary);
    
    return NextResponse.json({ 
      success: true,
      message: 'Facility and all associated data successfully deleted',
      details: {
        facilityId,
        facilityName: facility.name,
        deletionSummary
      }
    });
    
  } catch (error) {
    console.error('Error deleting facility:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}