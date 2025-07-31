import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('Facility client creation API called');
    
    // Check if we're in build mode
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('Build mode detected, returning early');
      return NextResponse.json(
        { error: 'Service not available during build' },
        { status: 503 }
      );
    }
    
    // Get the regular client to check the admin's session
    const supabase = await (await import('@/utils/supabase/server')).createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Ensure the user is logged in
    if (userError || !user) {
      console.log('FACILITY CLIENT API: No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Session user ID:', user.id);
    
    // Verify the admin's role
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      console.error('User is not an admin:', adminError || 'No profile or wrong role');
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create facility clients' },
        { status: 403 }
      );
    }
    
    // Extract data from the request
    const { facility_id, first_name, last_name, phone_number, address, notes, metadata } = await request.json();
    
    console.log('Creating facility client for facility:', facility_id);
    
    // Validate required fields
    if (!facility_id || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Facility ID, first name, and last name are required' },
        { status: 400 }
      );
    }
    
    // Verify the facility exists
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name')
      .eq('id', facility_id)
      .single();
    
    if (facilityError || !facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 400 }
      );
    }
    
    // Prepare the facility client data
    const facilityClientData = {
      facility_id,
      first_name,
      last_name,
      phone_number,
      address,
      notes,
      metadata,
      created_at: new Date().toISOString()
    };
    
    // Try to create in facility_managed_clients table first
    let clientId = null;
    
    try {
      const { data: facilityClient, error: facilityClientError } = await supabase
        .from('facility_managed_clients')
        .insert([facilityClientData])
        .select()
        .single();
      
      if (facilityClientError) {
        throw facilityClientError;
      }
      
      clientId = facilityClient.id;
      console.log('Created facility client in facility_managed_clients table:', clientId);
    } catch (facilityTableError) {
      console.log('facility_managed_clients table not available, trying managed_clients:', facilityTableError.message);
      
      // Fallback to managed_clients table if facility_managed_clients doesn't exist
      try {
        const { data: managedClient, error: managedClientError } = await supabase
          .from('managed_clients')
          .insert([{
            ...facilityClientData,
            // managed_clients might have different column names
            client_name: `${first_name} ${last_name}`,
            client_phone: phone_number
          }])
          .select()
          .single();
        
        if (managedClientError) {
          throw managedClientError;
        }
        
        clientId = managedClient.id;
        console.log('Created facility client in managed_clients table:', clientId);
      } catch (managedTableError) {
        console.error('Both facility tables failed:', managedTableError.message);
        return NextResponse.json({
          error: 'Facility client tables are not properly configured. Please contact your administrator.'
        }, { status: 500 });
      }
    }
    
    // Everything successful
    return NextResponse.json({
      success: true,
      clientId,
      facility: facility.name,
      message: `Facility client created successfully for ${facility.name}`
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}