import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get the server client
    const supabase = await (await import('@/utils/supabase/server')).createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('DEBUG AUTH API - User Error:', userError);
    console.log('DEBUG AUTH API - User:', user ? { id: user.id, email: user.email } : null);
    
    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        error: userError?.message || 'No user found'
      });
    }
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('DEBUG AUTH API - Profile Error:', profileError);
    console.log('DEBUG AUTH API - Profile:', profile);
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profileError: profileError?.message || null,
      hasAdminRole: profile?.role === 'admin',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('DEBUG AUTH API ERROR:', error);
    return NextResponse.json({
      error: 'Unexpected error: ' + error.message
    }, { status: 500 });
  }
}