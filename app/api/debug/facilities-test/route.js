import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        user_error: userError
      });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // Try to fetch facilities
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Also try with admin client
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    let adminFacilities = null;
    let adminError = null;
    
    if (supabaseAdmin) {
      const { data: adminData, error: adminErr } = await supabaseAdmin
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      
      adminFacilities = adminData;
      adminError = adminErr;
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profile_error: profileError,
      regular_query: {
        facilities_count: facilities?.length || 0,
        error: facilitiesError
      },
      admin_query: {
        facilities_count: adminFacilities?.length || 0,
        error: adminError
      }
    });
    
  } catch (error) {
    console.error('Debug facilities test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}