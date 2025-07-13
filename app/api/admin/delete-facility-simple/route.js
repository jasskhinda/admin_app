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
    
    console.log(`Starting simplified deletion process for facility: ${facilityId} (${facility.name})`);
    
    const deletionSummary = {
      facilityAdminsDeleted: 0,
      facilityClientsDeleted: 0,
      managedClientsDeleted: 0,
      tripsDeleted: 0,
      invoicesDeleted: 0
    };
    
    // 1. Get all facility admins
    const { data: facilityAdmins } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('facility_id', facilityId)
      .eq('role', 'facility');
      
    // 2. Get all facility clients
    const { data: facilityClients } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('facility_id', facilityId)
      .eq('role', 'client');
      
    // 3. Get all managed clients
    const { data: managedClients } = await supabase
      .from('facility_managed_clients')
      .select('id, email, first_name, last_name')
      .eq('facility_id', facilityId);
    
    // 4. Get all user IDs for trip/invoice cleanup
    const allFacilityUserIds = [
      ...(facilityAdmins || []).map(admin => admin.id),
      ...(facilityClients || []).map(client => client.id)
    ];
    
    // 5. Clean up trips (ignore errors for non-existent tables)
    if (allFacilityUserIds.length > 0) {
      try {
        const { error: tripsDeleteError, count: tripsCount } = await supabase
          .from('trips')
          .delete({ count: 'exact' })
          .in('user_id', allFacilityUserIds);
          
        if (tripsDeleteError) {
          console.warn('Could not delete trips:', tripsDeleteError.message);
        } else {
          deletionSummary.tripsDeleted = tripsCount || 0;
          console.log(`Deleted ${tripsCount || 0} trips`);
        }
      } catch (error) {
        console.warn('Could not delete trips (table may not exist):', error.message);
      }
    }
    
    // 6. Clean up invoices (ignore errors for non-existent tables)
    if (allFacilityUserIds.length > 0) {
      try {
        const { error: invoicesDeleteError, count: invoicesCount } = await supabase
          .from('invoices')
          .delete({ count: 'exact' })
          .in('user_id', allFacilityUserIds);
          
        if (invoicesDeleteError) {
          console.warn('Could not delete invoices:', invoicesDeleteError.message);
        } else {
          deletionSummary.invoicesDeleted = invoicesCount || 0;
          console.log(`Deleted ${invoicesCount || 0} invoices`);
        }
      } catch (error) {
        console.warn('Could not delete invoices (table may not exist):', error.message);
      }
    }
    
    // 7. Delete managed clients
    if (managedClients && managedClients.length > 0) {
      try {
        const { error: managedDeleteError, count: managedCount } = await supabase
          .from('facility_managed_clients')
          .delete({ count: 'exact' })
          .eq('facility_id', facilityId);
          
        if (managedDeleteError) {
          console.warn('Could not delete managed clients:', managedDeleteError.message);
        } else {
          deletionSummary.managedClientsDeleted = managedCount || 0;
          console.log(`Deleted ${managedCount || 0} managed clients`);
        }
      } catch (error) {
        console.warn('Could not delete managed clients:', error.message);
      }
    }
    
    // 8. Delete facility client profiles
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
      console.log(`Deleted ${clientsCount || 0} facility client profiles`);
      
      // Delete auth users for facility clients
      for (const client of facilityClients) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(client.id);
          console.log(`Deleted auth user for client: ${client.email}`);
        } catch (authError) {
          console.warn(`Could not delete auth user for client ${client.id}:`, authError.message);
        }
      }
    }
    
    // 9. Delete facility admin profiles
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
      console.log(`Deleted ${adminsCount || 0} facility admin profiles`);
      
      // Delete auth users for facility admins
      for (const admin of facilityAdmins) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(admin.id);
          console.log(`Deleted auth user for admin: ${admin.email}`);
        } catch (authError) {
          console.warn(`Could not delete auth user for admin ${admin.id}:`, authError.message);
        }
      }
    }
    
    // 10. Finally, delete the facility itself
    const { error: facilityDeleteError } = await supabase
      .from('facilities')
      .delete()
      .eq('id', facilityId);
      
    if (facilityDeleteError) {
      console.error('Error deleting facility:', facilityDeleteError);
      return NextResponse.json({ error: 'Error deleting facility record' }, { status: 500 });
    }
    
    console.log(`Successfully deleted facility: ${facilityId} (${facility.name})`, deletionSummary);
    
    return NextResponse.json({ 
      success: true,
      message: `Facility "${facility.name}" and all associated data successfully deleted`,
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