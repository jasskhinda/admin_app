import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('User check:', { user: user?.email, error: userError });
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: userError?.message 
      }, { status: 401 });
    }
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('Profile check:', { profile, error: profileError });
    
    if (profileError) {
      return NextResponse.json({ 
        error: 'Profile fetch failed', 
        details: profileError.message 
      }, { status: 500 });
    }
    
    // Try to fetch trips with different approaches
    
    // 1. Simple count query
    const { count: tripCount, error: countError } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true });
    
    console.log('Trip count:', { count: tripCount, error: countError });
    
    // 2. Basic select query
    const { data: basicTrips, error: basicError } = await supabase
      .from('trips')
      .select('id, created_at, status, user_id, managed_client_id, facility_id')
      .limit(5);
    
    console.log('Basic trips:', { count: basicTrips?.length, error: basicError });
    
    // 3. Try with admin client
    let adminTrips = null;
    let adminError = null;
    try {
      const { supabaseAdmin } = await import('@/lib/admin-supabase');
      if (supabaseAdmin) {
        const { data: adminData, error: adminErr } = await supabaseAdmin
          .from('trips')
          .select('id, created_at, status, user_id, managed_client_id, facility_id')
          .limit(5);
        
        adminTrips = adminData;
        adminError = adminErr;
        console.log('Admin trips:', { count: adminData?.length, error: adminErr });
      }
    } catch (adminImportError) {
      console.log('Admin client not available:', adminImportError.message);
    }
    
    // 4. Try the new simplified query from the trips page
    const { data: pageTrips, error: pageError } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Page query trips:', { count: pageTrips?.length, error: pageError });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: profile.id,
        role: profile.role,
        email: profile.email
      },
      tripCount,
      countError: countError?.message,
      basicTrips: basicTrips?.map(t => ({
        id: t.id,
        created_at: t.created_at,
        status: t.status,
        user_id: t.user_id,
        managed_client_id: t.managed_client_id,
        facility_id: t.facility_id
      })),
      basicError: basicError?.message,
      adminTrips: adminTrips?.map(t => ({
        id: t.id,
        created_at: t.created_at,
        status: t.status,
        user_id: t.user_id,
        managed_client_id: t.managed_client_id,
        facility_id: t.facility_id
      })),
      adminError: adminError?.message,
      pageTrips: pageTrips?.map(t => ({
        id: t.id,
        created_at: t.created_at,
        status: t.status,
        user_id: t.user_id,
        managed_client_id: t.managed_client_id,
        facility_id: t.facility_id
      })),
      pageError: pageError?.message
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}