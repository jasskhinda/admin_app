import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('CREATE FACILITY API: Starting...');
    
    const supabase = await createClient();
    
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('CREATE FACILITY API: User check result:', { user: !!user, error: userError });
    
    // Ensure the user is logged in
    if (userError || !user) {
      console.log('CREATE FACILITY API: No user found');
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
    
    console.log('CREATE FACILITY API: Profile check result:', { profile: adminProfile, error: adminError });
    
    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      console.log('CREATE FACILITY API: Not an admin');
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create facilities' },
        { status: 403 }
      );
    }
    
    // Extract facility data from the request
    const facilityData = await request.json();
    console.log('CREATE FACILITY API: Facility data:', facilityData);
    
    // Try to use admin client for facilities creation
    let facility = null;
    let facilityError = null;
    
    try {
      // First try with regular client
      const { data: regularFacility, error: regularError } = await supabase
        .from('facilities')
        .insert([facilityData])
        .select()
        .single();
        
      if (regularError) {
        console.log('CREATE FACILITY API: Regular insert failed, trying admin client:', regularError);
        
        // Try with admin client
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
          const { data: adminFacility, error: adminError } = await supabaseAdmin
            .from('facilities')
            .insert([facilityData])
            .select()
            .single();
            
          facility = adminFacility;
          facilityError = adminError;
          console.log('CREATE FACILITY API: Admin insert result:', { facility, error: facilityError });
        } else {
          facilityError = regularError;
        }
      } else {
        facility = regularFacility;
        console.log('CREATE FACILITY API: Regular insert succeeded:', facility);
      }
    } catch (insertError) {
      console.error('CREATE FACILITY API: Insert exception:', insertError);
      facilityError = insertError;
    }
      
    if (facilityError) {
      console.error('CREATE FACILITY API: Error creating facility:', facilityError);
      return NextResponse.json(
        { error: `Error creating facility: ${facilityError.message}` },
        { status: 500 }
      );
    }
    
    // Step 2: Create facility owner if owner data is provided
    let ownerResult = null;
    if (facilityData.ownerEmail && facilityData.ownerFirstName && facilityData.ownerLastName) {
      console.log('CREATE FACILITY API: Creating facility owner...');
      
      try {
        // Get admin client for user creation
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
          // Generate password for owner
          const ownerPassword = facilityData.ownerPassword || `Facility${new Date().getFullYear()}!${Math.random().toString(36).slice(-6)}`;

          // Create auth user for facility owner
          const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: facilityData.ownerEmail,
            password: ownerPassword,
            email_confirm: true,
            user_metadata: {
              first_name: facilityData.ownerFirstName,
              last_name: facilityData.ownerLastName,
              role: 'facility'
            }
          });

          if (authError) {
            console.error('CREATE FACILITY API: Owner auth creation failed:', authError);
          } else {
            console.log('CREATE FACILITY API: Owner auth user created:', newUser.user.id);

            // Update the auto-created profile
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .update({
                first_name: facilityData.ownerFirstName,
                last_name: facilityData.ownerLastName,
                facility_id: facility.id,
                role: 'facility',
                email: facilityData.ownerEmail,
                status: 'active'
              })
              .eq('id', newUser.user.id);

            if (profileError) {
              console.error('CREATE FACILITY API: Owner profile update failed:', profileError);
            } else {
              console.log('CREATE FACILITY API: Owner profile updated');

              // Create facility_users entry with owner status
              const { error: facilityUserError } = await supabaseAdmin
                .from('facility_users')
                .insert({
                  facility_id: facility.id,
                  user_id: newUser.user.id,
                  role: 'super_admin',
                  is_owner: true,
                  invited_by: null, // System created
                  status: 'active'
                });

              if (facilityUserError) {
                console.error('CREATE FACILITY API: Facility owner entry failed:', facilityUserError);
              } else {
                console.log('CREATE FACILITY API: Facility owner created successfully');
                ownerResult = {
                  userId: newUser.user.id,
                  email: facilityData.ownerEmail,
                  firstName: facilityData.ownerFirstName,
                  lastName: facilityData.ownerLastName,
                  credentials: {
                    email: facilityData.ownerEmail,
                    password: ownerPassword
                  }
                };
              }
            }
          }
        }
      } catch (ownerError) {
        console.error('CREATE FACILITY API: Owner creation error:', ownerError);
        // Don't fail the facility creation if owner creation fails
      }
    }

    console.log('CREATE FACILITY API: Success');
    return NextResponse.json({
      success: true,
      facility: facility,
      owner: ownerResult
    });
    
  } catch (error) {
    console.error('CREATE FACILITY API: Unexpected error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}