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
    
    // Create the facility record
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .insert([facilityData])
      .select()
      .single();
      
    console.log('CREATE FACILITY API: Insert result:', { facility, error: facilityError });
      
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