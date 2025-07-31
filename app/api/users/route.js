import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('User creation API called');
    
    // Check if we're in build mode
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('Build mode detected, returning early');
      return NextResponse.json(
        { error: 'Service not available during build' },
        { status: 503 }
      );
    }
    
    // Dynamic import to avoid build-time errors
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized - missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Service role key is not configured. Please contact your administrator.' },
        { status: 500 }
      );
    }
    
    // Get the regular client to check the admin's session
    const supabase = await (await import('@/utils/supabase/server')).createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Ensure the user is logged in
    if (userError || !user) {
      console.log('USER API: No user found');
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
        { error: 'Forbidden: Only admins can create users' },
        { status: 403 }
      );
    }
    
    // Extract data from the request
    const { email, password, userProfile, role } = await request.json();
    
    console.log('Creating new user with role:', role);
    console.log('Email:', email);
    
    // Step 1: Check if user already exists in Auth
    let newUserId = null;
    
    try {
      // First try to find by email directly
      const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      
      if (error) {
        console.log('Error finding user by email:', error);
        // Continue to create new user
      } else if (data && data.user) {
        newUserId = data.user.id;
        console.log('Found existing auth user by email with ID:', newUserId);
      }
    } catch (emailLookupError) {
      console.error('Exception in email lookup:', emailLookupError);
      // Continue to create new user
    }
    
    if (newUserId) {
      // We already found the user by email above
      console.log('Using existing user ID:', newUserId);
    } else {
      // Create new Auth user
      console.log('Creating new auth user');
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role }
      });
      
      if (createError) {
        console.error('Error creating auth user:', createError);
        return NextResponse.json(
          { error: `Error creating user: ${createError.message}` },
          { status: 500 }
        );
      }
      
      if (!userData || !userData.user) {
        console.error('No user data returned from auth creation');
        return NextResponse.json(
          { error: 'Failed to create user - no response data' },
          { status: 500 }
        );
      }
      
      newUserId = userData.user.id;
      console.log('Created new auth user with ID:', newUserId);
    }
    
    // Step 2: Check for existing profile
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', newUserId)
      .single();
    
    if (existingProfile) {
      console.log('User already has a profile with role:', existingProfile.role);
      
      // If this isn't what we want, return error
      if (existingProfile.role !== role) {
        return NextResponse.json({
          error: `This user already has a different role (${existingProfile.role}). Cannot change to ${role}.`
        }, { status: 400 });
      }
      
      // Otherwise, maybe update some fields
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: email, // Ensure email is included in the update
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          phone_number: userProfile.phone_number,
          // Add other fields as needed
          ...(userProfile.vehicle_model ? { vehicle_model: userProfile.vehicle_model } : {}),
          ...(userProfile.vehicle_license ? { vehicle_license: userProfile.vehicle_license } : {}),
          ...(userProfile.address ? { address: userProfile.address } : {}),
          ...(userProfile.notes ? { notes: userProfile.notes } : {}),
          ...(userProfile.status ? { status: userProfile.status } : {}),
          ...(userProfile.facility_id ? { facility_id: userProfile.facility_id } : {}),
          ...(userProfile.metadata ? { metadata: userProfile.metadata } : {})
        })
        .eq('id', newUserId);
      
      if (updateError) {
        console.error('Error updating existing profile:', updateError);
        return NextResponse.json({
          error: `Error updating profile: ${updateError.message}`
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        userId: newUserId,
        profile: {
          id: newUserId,
          role,
          ...userProfile
        },
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} profile updated successfully`
      });
    }
    
    // Step 3: Create new profile
    console.log('Creating new profile with role:', role);
    
    // Prepare the profile data
    const profileData = {
      id: newUserId,
      role,
      email: email, // Ensure email is included in the profile
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
      phone_number: userProfile.phone_number,
      created_at: new Date().toISOString(),
      // Only include fields that exist and are provided
      ...(userProfile.vehicle_model ? { vehicle_model: userProfile.vehicle_model } : {}),
      ...(userProfile.vehicle_license ? { vehicle_license: userProfile.vehicle_license } : {}),
      ...(userProfile.address ? { address: userProfile.address } : {}),
      ...(userProfile.notes ? { notes: userProfile.notes } : {}),
      ...(userProfile.status ? { status: userProfile.status } : {}),
      ...(userProfile.facility_id ? { facility_id: userProfile.facility_id } : {}),
      ...(userProfile.metadata ? { metadata: userProfile.metadata } : {})
    };
    
    // Create the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([profileData]);
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      return NextResponse.json({
        error: `Error creating profile: ${profileError.message}`
      }, { status: 500 });
    }
    
    // Everything successful
    return NextResponse.json({
      success: true,
      userId: newUserId,
      profile: {
        id: newUserId,
        role,
        ...userProfile
      },
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}