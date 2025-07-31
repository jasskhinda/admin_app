import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('Facilities GET API called');
    
    // Get the server client
    const supabase = await createClient();
    
    // Fetch facilities
    const { data, error } = await supabase
      .from('facilities')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching facilities:', error);
      return NextResponse.json([], { status: 200 }); // Return empty array instead of error
    }
    
    console.log('Fetched facilities:', data?.length || 0);
    return NextResponse.json(data || []);
    
  } catch (error) {
    console.error('Facilities GET API error:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}

export async function POST(request) {
  try {
    console.log('Facility creation API called');
    
    // Check cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log('Available cookies:', allCookies.map(c => c.name));
    
    // Get the server client
    const supabase = await createClient();
    console.log('Supabase client created');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Auth check result:', { user: user?.id, error: userError });
    
    // Ensure the user is logged in
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }
    
    console.log('Authenticated user:', user.id);
    
    // Verify the admin's role
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create facilities' },
        { status: 403 }
      );
    }
    
    // Extract facility data from the request
    const facilityData = await request.json();
    
    console.log('Creating facility with data:', facilityData);
    
    // Create the facility
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .insert([facilityData])
      .select()
      .single();
    
    if (facilityError) {
      console.error('Error creating facility:', facilityError);
      return NextResponse.json({
        error: `Error creating facility: ${facilityError.message}`
      }, { status: 500 });
    }
    
    // Everything successful
    return NextResponse.json({
      success: true,
      facility: facility,
      message: 'Facility created successfully'
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}