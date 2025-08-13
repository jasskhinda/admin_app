import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('CREATE FACILITY OWNER API: Starting...');
    
    const supabase = await createClient();
    
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('CREATE FACILITY OWNER API: User check result:', { user: !!user, error: userError });
    
    // Ensure the user is logged in
    if (userError || !user) {
      console.log('CREATE FACILITY OWNER API: No user found');
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
    
    console.log('CREATE FACILITY OWNER API: Profile check result:', { profile: adminProfile, error: adminError });
    
    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      console.log('CREATE FACILITY OWNER API: Not an admin');
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create facility owners' },
        { status: 403 }
      );
    }
    
    // Extract owner data from the request
    const { facilityId, email, firstName, lastName, password } = await request.json();
    console.log('CREATE FACILITY OWNER API: Owner data:', { facilityId, email, firstName, lastName });
    
    if (!facilityId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: facilityId, email, firstName, lastName' },
        { status: 400 }
      );
    }
    
    // Get admin client for user creation
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }

    // Check if facility exists
    const { data: facility, error: facilityError } = await supabaseAdmin
      .from('facilities')
      .select('id, name')
      .eq('id', facilityId)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Check if facility already has an owner
    const { data: existingOwner, error: ownerCheckError } = await supabaseAdmin
      .from('facility_users')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('is_owner', true)
      .eq('status', 'active')
      .single();

    if (existingOwner) {
      return NextResponse.json(
        { error: 'Facility already has an owner' },
        { status: 409 }
      );
    }

    // Generate password if not provided
    const ownerPassword = password || `Facility${new Date().getFullYear()}!${Math.random().toString(36).slice(-6)}`;

    console.log('CREATE FACILITY OWNER API: Creating auth user...');
    
    // Step 1: Create auth user
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'facility'
      }
    });

    if (authError) {
      console.error('CREATE FACILITY OWNER API: Auth user creation failed:', authError);
      return NextResponse.json(
        { error: `Failed to create user account: ${authError.message}` },
        { status: 500 }
      );
    }

    console.log('CREATE FACILITY OWNER API: Auth user created:', newUser.user.id);

    // Step 2: Update the auto-created profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        facility_id: facilityId,
        role: 'facility',
        email: email,
        status: 'active'
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('CREATE FACILITY OWNER API: Profile update failed:', profileError);
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: `Failed to update user profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    console.log('CREATE FACILITY OWNER API: Profile updated');

    // Step 3: Create facility_users entry with owner status
    const { error: facilityUserError } = await supabaseAdmin
      .from('facility_users')
      .insert({
        facility_id: facilityId,
        user_id: newUser.user.id,
        role: 'super_admin',
        is_owner: true,
        invited_by: null, // System created
        status: 'active'
      });

    if (facilityUserError) {
      console.error('CREATE FACILITY OWNER API: Facility user creation failed:', facilityUserError);
      // Don't fail completely - the profile was created successfully
      console.log('⚠️ User profile created but facility_users entry failed. User can still login.');
    } else {
      console.log('✅ Facility owner created successfully');
    }

    console.log('CREATE FACILITY OWNER API: Success');
    return NextResponse.json({
      success: true,
      message: 'Facility owner created successfully',
      owner: {
        userId: newUser.user.id,
        email: email,
        firstName: firstName,
        lastName: lastName,
        facilityId: facilityId,
        facilityName: facility.name,
        role: 'super_admin',
        isOwner: true
      },
      credentials: {
        email: email,
        password: ownerPassword
      }
    });
    
  } catch (error) {
    console.error('CREATE FACILITY OWNER API: Unexpected error:', error);
    return NextResponse.json({
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}