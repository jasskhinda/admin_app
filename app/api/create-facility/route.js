import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get the regular client to check the admin's session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    // Ensure the user is logged in
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the admin's role
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create facilities' },
        { status: 403 }
      );
    }
    
    // Extract facility data from the request
    const facilityData = await request.json();
    
    // Create the facility record
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .insert([facilityData])
      .select()
      .single();
      
    if (facilityError) {
      console.error('Error creating facility:', facilityError);
      return NextResponse.json(
        { error: `Error creating facility: ${facilityError.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      facility: facility
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}