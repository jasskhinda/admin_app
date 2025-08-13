import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Settings Debug API ===');
    
    // Check environment variables
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Environment check:', { hasSupabaseUrl, hasSupabaseKey });
    
    if (!hasSupabaseUrl || !hasSupabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables',
        hasSupabaseUrl,
        hasSupabaseKey
      }, { status: 500 });
    }

    const supabase = await createClient();
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('Supabase connection error:', testError);
      return NextResponse.json({
        error: 'Supabase connection failed',
        details: testError.message
      }, { status: 500 });
    }

    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User auth error:', userError);
      return NextResponse.json({
        error: 'Authentication error',
        details: userError.message,
        authenticated: false
      }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({
        error: 'No authenticated user',
        authenticated: false
      }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({
        error: 'Profile fetch failed',
        details: profileError.message,
        userId: user.id
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        authenticated: true
      },
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: profile.full_name
      } : null,
      environment: {
        hasSupabaseUrl,
        hasSupabaseKey
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message
    }, { status: 500 });
  }
}