import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin client not initialized',
        hasEnvVars: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
    }
    
    // Test admin client with a simple query
    const { data, error } = await supabaseAdmin
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    return NextResponse.json({
      success: true,
      adminClientWorking: !error,
      error: error?.message,
      facilityCount: data?.length || 0,
      hasEnvVars: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      hasEnvVars: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  }
}