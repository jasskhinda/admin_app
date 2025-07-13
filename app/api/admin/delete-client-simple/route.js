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
    
    console.log(`Starting simple deletion process for client: ${clientId}`);
    
    // Clean up related data (ignore errors for non-existent tables)
    
    // Try to delete trips (ignore if table doesn't exist)
    try {
      await supabase
        .from('trips')
        .delete()
        .eq('user_id', clientId);
      console.log('Deleted trips for client');
    } catch (error) {
      console.warn('Could not delete trips:', error.message);
    }
    
    // Try to delete invoices (ignore if table doesn't exist)
    try {
      await supabase
        .from('invoices')
        .delete()
        .eq('user_id', clientId);
      console.log('Deleted invoices for client');
    } catch (error) {
      console.warn('Could not delete invoices:', error.message);
    }
    
    // Try to delete managed client record if exists
    try {
      await supabase
        .from('facility_managed_clients')
        .delete()
        .eq('email', client.email);
      console.log('Deleted managed client record');
    } catch (error) {
      console.warn('Could not delete managed client record:', error.message);
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
    
    // Delete auth user
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(clientId);
      
      if (authDeleteError) {
        console.warn('Error deleting auth user:', authDeleteError);
        // Don't fail here as profile is already deleted
      } else {
        console.log('Successfully deleted auth user');
      }
    } catch (error) {
      console.warn('Exception deleting auth user:', error);
    }
    
    console.log(`Successfully deleted client: ${clientId}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Client successfully deleted',
      details: {
        clientId,
        clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim()
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