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

    console.log('CREATE CLIENT FOR FACILITY API: Creating user account...');
    
    // Get admin client for user creation
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }

    // Step 1: Check if user already exists, if not create auth user
    let newUserId;
    let isExistingUser = false;

    // First, check if user already exists
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({
      filter: `email.eq.${clientData.email}`
    });
    
    if (existingUser && existingUser.users && existingUser.users.length > 0) {
      console.log('CREATE CLIENT FOR FACILITY API: User already exists:', existingUser.users[0].id);
      newUserId = existingUser.users[0].id;
      isExistingUser = true;
      
      // Check if this user is already a client for this facility
      const { data: existingClient, error: clientCheckError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('user_id', newUserId)
        .eq('facility_id', clientData.facilityId)
        .single();
        
      if (existingClient) {
        return NextResponse.json(
          { error: 'Client already exists for this facility' },
          { status: 409 }
        );
      }
    } else {
      // Create new auth user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: clientData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: 'client' }
      });

      if (createError) {
        console.error('CREATE CLIENT FOR FACILITY API: Auth user creation failed:', createError);
        throw new Error(`Error creating auth user: ${createError.message}`);
      }

      newUserId = userData.user.id;
      console.log('CREATE CLIENT FOR FACILITY API: Auth user created:', newUserId);
    }

    // Step 2: Update or create profile (only if not an existing user)
    if (!isExistingUser) {
      const profileUpdate = {
        role: 'client',
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        phone_number: clientData.phoneNumber,
        address: clientData.address,
        facility_id: clientData.facilityId,
        status: 'active'
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', newUserId);

      if (profileError) {
        console.error('CREATE CLIENT FOR FACILITY API: Profile update failed:', profileError);
        throw new Error(`Error updating profile: ${profileError.message}`);
      }

      console.log('CREATE CLIENT FOR FACILITY API: Profile updated successfully');
    } else {
      console.log('CREATE CLIENT FOR FACILITY API: Skipping profile update for existing user');
    }

    // Step 3: Create client record in clients table
    const clientRecord = {
      user_id: newUserId,
      facility_id: clientData.facilityId,
      accessibility_needs: clientData.accessibilityNeeds || null,
      medical_requirements: clientData.medicalRequirements || null,
      emergency_contact_name: clientData.emergencyContact || null,
      status: 'active',
      created_at: new Date().toISOString()
    };

    console.log('CREATE CLIENT FOR FACILITY API: Creating client record...', clientRecord);

    const { data: clientResult, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([clientRecord])
      .select()
      .single();
      
    if (clientError) {
      console.error('CREATE CLIENT FOR FACILITY API: Client record creation failed:', clientError);
      return NextResponse.json(
        { error: `Error creating client record: ${clientError.message}` },
        { status: 500 }
      );
    }
    
    console.log('CREATE CLIENT FOR FACILITY API: Success - all records created');
    return NextResponse.json({
      success: true,
      client: clientResult,
      user: {
        userId: newUserId,
        email: clientData.email
      },
      message: isExistingUser 
        ? `Existing user successfully associated with ${facility.name}` 
        : `Client successfully created and associated with ${facility.name}`
    });
    
  } catch (error) {
    console.error('CREATE CLIENT FOR FACILITY API: Unexpected error:', error);
    return NextResponse.json({
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}