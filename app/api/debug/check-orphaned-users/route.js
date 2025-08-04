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
    
    // Get admin client
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    // 1. Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json({ error: 'Error fetching auth users', details: authError }, { status: 500 });
    }
    
    // 2. Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (profilesError) {
      return NextResponse.json({ error: 'Error fetching profiles', details: profilesError }, { status: 500 });
    }
    
    // 3. Get all facility managed clients
    const { data: managedClients, error: managedError } = await supabase
      .from('facility_managed_clients')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (managedError) {
      return NextResponse.json({ error: 'Error fetching managed clients', details: managedError }, { status: 500 });
    }
    
    // 4. Find orphaned records
    const profileIds = new Set(profiles.map(p => p.id));
    const orphanedAuthUsers = authUsers.filter(u => !profileIds.has(u.id));
    
    // 5. Count users by role
    const usersByRole = profiles.reduce((acc, profile) => {
      acc[profile.role || 'no_role'] = (acc[profile.role || 'no_role'] || 0) + 1;
      return acc;
    }, {});
    
    // 6. Find duplicate emails
    const emailCounts = {};
    const allEmails = [
      ...authUsers.map(u => ({ email: u.email, source: 'auth', id: u.id })),
      ...profiles.filter(p => p.email).map(p => ({ email: p.email, source: 'profile', id: p.id })),
      ...managedClients.map(c => ({ email: c.email, source: 'managed', id: c.id }))
    ];
    
    allEmails.forEach(item => {
      if (!emailCounts[item.email]) {
        emailCounts[item.email] = [];
      }
      emailCounts[item.email].push(item);
    });
    
    const duplicateEmails = Object.entries(emailCounts)
      .filter(([email, items]) => items.length > 1)
      .map(([email, items]) => ({ email, occurrences: items }));
    
    // 7. Summary report
    const report = {
      summary: {
        total_auth_users: authUsers.length,
        total_profiles: profiles.length,
        total_managed_clients: managedClients.length,
        orphaned_auth_users: orphanedAuthUsers.length,
        users_by_role: usersByRole,
        duplicate_emails_count: duplicateEmails.length
      },
      orphaned_auth_users: orphanedAuthUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      })),
      duplicate_emails: duplicateEmails,
      profiles_without_role: profiles.filter(p => !p.role).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at
      })),
      // Show a few client records for verification
      sample_data: {
        client_profiles: profiles.filter(p => p.role === 'client').slice(0, 5).map(p => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          facility_id: p.facility_id,
          created_at: p.created_at
        })),
        managed_clients: managedClients.slice(0, 5).map(c => ({
          id: c.id,
          email: c.email,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          facility_id: c.facility_id,
          created_at: c.created_at
        }))
      }
    };
    
    return NextResponse.json(report, { status: 200 });
    
  } catch (error) {
    console.error('Error in orphaned users check:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}