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
    
    // Check if managed client exists
    const { data: managedClient, error: clientError } = await supabase
      .from('facility_managed_clients')
      .select('*')
      .eq('id', clientId)
      .single();
      
    if (clientError || !managedClient) {
      return NextResponse.json({ error: 'Managed client not found' }, { status: 404 });
    }
    
    console.log(`Starting deletion process for managed client: ${clientId} (${managedClient.email})`);
    
    // Try to delete any associated trips (ignore errors for non-existent tables)
    try {
      await supabase
        .from('trips')
        .delete()
        .eq('email', managedClient.email);
      console.log('Deleted trips for managed client');
    } catch (error) {
      console.warn('Could not delete trips:', error.message);
    }
    
    // Try to delete any associated invoices (ignore errors for non-existent tables)
    try {
      await supabase
        .from('invoices')
        .delete()
        .eq('email', managedClient.email);
      console.log('Deleted invoices for managed client');
    } catch (error) {
      console.warn('Could not delete invoices:', error.message);
    }
    
    // Delete the managed client record
    const { error: deleteError } = await supabase
      .from('facility_managed_clients')
      .delete()
      .eq('id', clientId);
      
    if (deleteError) {
      console.error('Error deleting managed client:', deleteError);
      return NextResponse.json({ error: 'Error deleting managed client record' }, { status: 500 });
    }
    
    console.log(`Successfully deleted managed client: ${clientId} (${managedClient.email})`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Managed client successfully deleted',
      details: {
        clientId,
        clientName: `${managedClient.first_name || ''} ${managedClient.last_name || ''}`.trim(),
        clientEmail: managedClient.email
      }
    });
    
  } catch (error) {
    console.error('Error deleting managed client:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}