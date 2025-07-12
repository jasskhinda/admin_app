import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('CREATE CLIENT FOR FACILITY API: Starting...');
    
    const supabase = await createClient();
    
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('CREATE CLIENT FOR FACILITY API: User check result:', { user: !!user, error: userError });
    
    // Ensure the user is logged in
    if (userError || !user) {
      console.log('CREATE CLIENT FOR FACILITY API: No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the admin's role
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('CREATE CLIENT FOR FACILITY API: Profile check result:', { profile: adminProfile, error: adminError });
    
    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      console.log('CREATE CLIENT FOR FACILITY API: Not an admin');
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create clients for facilities' },
        { status: 403 }
      );
    }
    
    // Extract client data from the request
    const clientData = await request.json();
    console.log('CREATE CLIENT FOR FACILITY API: Client data:', clientData);

    // Verify facility exists
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', clientData.facilityId)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Generate a temporary password for the client
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(10).slice(-2);

    // Step 1: Create user account using the existing /api/users endpoint
    const userProfile = {
      first_name: clientData.firstName,
      last_name: clientData.lastName,
      phone_number: clientData.phoneNumber,
      address: clientData.address,
      facility_id: clientData.facilityId,
      status: 'active'
    };

    console.log('CREATE CLIENT FOR FACILITY API: Creating user account...');
    
    // Create user account
    const userResponse = await fetch(new URL('/api/users', request.url), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({
        email: clientData.email,
        password: tempPassword,
        userProfile: userProfile,
        role: 'client'
      })
    });

    if (!userResponse.ok) {
      const userError = await userResponse.json();
      console.error('CREATE CLIENT FOR FACILITY API: User creation failed:', userError);
      throw new Error(userError.error || 'Failed to create user account');
    }

    const userResult = await userResponse.json();
    console.log('CREATE CLIENT FOR FACILITY API: User created:', userResult);

    // Step 2: Create client record in clients table
    const clientRecord = {
      user_id: userResult.userId,
      facility_id: clientData.facilityId,
      accessibility_needs: clientData.accessibilityNeeds || null,
      medical_requirements: clientData.medicalRequirements || null,
      emergency_contact_name: clientData.emergencyContact || null,
      status: 'active'
    };

    console.log('CREATE CLIENT FOR FACILITY API: Creating client record...');

    // Try to use admin client for client creation
    let clientResult = null;
    let clientError = null;
    
    try {
      // First try with regular client
      const { data: regularClient, error: regularError } = await supabase
        .from('clients')
        .insert([clientRecord])
        .select()
        .single();
        
      if (regularError) {
        console.log('CREATE CLIENT FOR FACILITY API: Regular insert failed, trying admin client:', regularError);
        
        // Try with admin client
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
          const { data: adminClient, error: adminError } = await supabaseAdmin
            .from('clients')
            .insert([clientRecord])
            .select()
            .single();
            
          clientResult = adminClient;
          clientError = adminError;
          console.log('CREATE CLIENT FOR FACILITY API: Admin insert result:', { client: clientResult, error: clientError });
        } else {
          clientError = regularError;
        }
      } else {
        clientResult = regularClient;
        console.log('CREATE CLIENT FOR FACILITY API: Regular insert succeeded:', clientResult);
      }
    } catch (insertError) {
      console.error('CREATE CLIENT FOR FACILITY API: Insert exception:', insertError);
      clientError = insertError;
    }
      
    if (clientError) {
      console.error('CREATE CLIENT FOR FACILITY API: Error creating client record:', clientError);
      return NextResponse.json(
        { error: `Error creating client record: ${clientError.message}` },
        { status: 500 }
      );
    }
    
    console.log('CREATE CLIENT FOR FACILITY API: Success');
    return NextResponse.json({
      success: true,
      client: clientResult,
      user: userResult,
      message: `Client successfully created and associated with ${facility.name}`
    });
    
  } catch (error) {
    console.error('CREATE CLIENT FOR FACILITY API: Unexpected error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}