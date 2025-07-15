import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test facility IDs from the logs
    const testIds = [
      '3cf71268-23dd-40fe-bcc1-2e926dde042d',
      'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
    ];
    
    // Test 1: Get all facilities
    const { data: allFacilities, error: allError } = await supabase
      .from('facilities')
      .select('*');
    
    // Test 2: Get specific facilities
    const { data: specificFacilities, error: specificError } = await supabase
      .from('facilities')
      .select('id, name, contact_email, contact_phone')
      .in('id', testIds);
    
    // Test 3: Get user info
    const { data: { user } } = await supabase.auth.getUser();
    
    // Test 4: Get user profile
    let profile = null;
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = profileData;
    }
    
    return NextResponse.json({
      user: user?.email,
      userRole: profile?.role,
      allFacilitiesCount: allFacilities?.length || 0,
      allError: allError?.message,
      specificFacilities: specificFacilities || [],
      specificError: specificError?.message,
      testIds
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}