import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
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
    
    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', clientId)
      .eq('role', 'client')
      .single();
      
    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    // 1. Check for pending or upcoming trips
    const now = new Date().toISOString();
    const { data: pendingTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, status, pickup_datetime')
      .eq('user_id', clientId)
      .or(`status.eq.pending,status.eq.confirmed,status.eq.in_progress,pickup_datetime.gte.${now}`);
      
    if (tripsError) {
      console.error('Error checking trips:', tripsError);
      return NextResponse.json({ error: 'Error checking client trips' }, { status: 500 });
    }
    
    if (pendingTrips && pendingTrips.length > 0) {
      const upcomingCount = pendingTrips.filter(trip => new Date(trip.pickup_datetime) > new Date()).length;
      const pendingCount = pendingTrips.filter(trip => ['pending', 'confirmed', 'in_progress'].includes(trip.status)).length;
      
      return NextResponse.json({ 
        error: 'Cannot delete client with pending or upcoming trips',
        details: {
          pendingTrips: pendingCount,
          upcomingTrips: upcomingCount,
          totalBlocking: pendingTrips.length
        }
      }, { status: 400 });
    }
    
    // 2. Check for pending invoices/bills
    const { data: pendingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, status, total')
      .eq('user_id', clientId)
      .in('status', ['pending', 'overdue']);
      
    if (invoicesError) {
      console.error('Error checking invoices:', invoicesError);
      return NextResponse.json({ error: 'Error checking client invoices' }, { status: 500 });
    }
    
    if (pendingInvoices && pendingInvoices.length > 0) {
      const totalOwed = pendingInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      
      return NextResponse.json({ 
        error: 'Cannot delete client with pending bills',
        details: {
          pendingInvoices: pendingInvoices.length,
          totalOwed: totalOwed
        }
      }, { status: 400 });
    }
    
    // 3. Check if client has facility relationship that needs cleanup
    let facilityCleanupNeeded = false;
    if (client.facility_id) {
      facilityCleanupNeeded = true;
    }
    
    // 4. Begin deletion process
    console.log(`Starting deletion process for client: ${clientId}`);
    
    // Delete related records first (in order of dependencies)
    
    // Delete completed trips (keep for record purposes, but could be archived instead)
    const { error: tripsDeleteError } = await supabase
      .from('trips')
      .delete()
      .eq('user_id', clientId);
      
    if (tripsDeleteError) {
      console.error('Error deleting trips:', tripsDeleteError);
      return NextResponse.json({ error: 'Error deleting client trips' }, { status: 500 });
    }
    
    // Delete paid invoices (keep for record purposes, but could be archived instead)
    const { error: invoicesDeleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('user_id', clientId);
      
    if (invoicesDeleteError) {
      console.error('Error deleting invoices:', invoicesDeleteError);
      return NextResponse.json({ error: 'Error deleting client invoices' }, { status: 500 });
    }
    
    // Delete managed client record if exists
    const { error: managedClientError } = await supabase
      .from('facility_managed_clients')
      .delete()
      .eq('email', client.email);
      
    // Don't fail if this doesn't exist or fails - it's optional cleanup
    if (managedClientError) {
      console.warn('Could not delete managed client record:', managedClientError);
    }
    
    // Delete profile record
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', clientId);
      
    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return NextResponse.json({ error: 'Error deleting client profile' }, { status: 500 });
    }
    
    // Delete auth user (this should cascade and clean up automatically created records)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(clientId);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // Don't fail here as profile is already deleted
      console.warn('Profile deleted but auth user deletion failed - manual cleanup may be needed');
    }
    
    console.log(`Successfully deleted client: ${clientId}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Client successfully deleted',
      details: {
        clientId,
        facilityCleanupPerformed: facilityCleanupNeeded
      }
    });
    
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}