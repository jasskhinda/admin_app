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
    
    console.log('CREATE FACILITY API: Success');
    return NextResponse.json({
      success: true,
      facility: facility
    });
    
  } catch (error) {
    console.error('CREATE FACILITY API: Unexpected error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}