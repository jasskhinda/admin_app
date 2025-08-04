import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Test admin client
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    
    const results = {
      adminClientExists: !!supabaseAdmin,
      envVars: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 'Missing',
        serviceKeyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
          process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' : 'Missing'
      }
    };
    
    if (supabaseAdmin) {
      try {
        // Test listing users (should work with service role)
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1
        });
        
        results.adminTest = {
          canListUsers: !listError,
          listError: listError ? {
            message: listError.message,
            code: listError.code,
            status: listError.status
          } : null,
          userCount: users ? users.length : 0
        };
        
        // Test getting a specific user (using the first orphaned user from your list)
        if (!listError && users && users.length > 0) {
          const testUserId = 'dd370767-45b8-4aeb-8cc1-b7a3c5d4e2ef'; // From your diagnostics
          
          try {
            const { data: { user: testUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(testUserId);
            
            results.getUserTest = {
              canGetUser: !getUserError,
              getUserError: getUserError ? {
                message: getUserError.message,
                code: getUserError.code,
                status: getUserError.status
              } : null,
              userExists: !!testUser
            };
          } catch (error) {
            results.getUserTest = {
              canGetUser: false,
              getUserError: {
                message: error.message,
                type: 'exception'
              }
            };
          }
        }
        
      } catch (error) {
        results.adminTest = {
          canListUsers: false,
          listError: {
            message: error.message,
            type: 'exception'
          }
        };
      }
    }
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (error) {
    console.error('Error testing admin client:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}