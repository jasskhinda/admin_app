import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { dryRun = true } = body; // Default to dry run for safety
    
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
      .select('id')
      .order('created_at', { ascending: false });
      
    if (profilesError) {
      return NextResponse.json({ error: 'Error fetching profiles', details: profilesError }, { status: 500 });
    }
    
    // 3. Find orphaned auth users (users without profiles)
    const profileIds = new Set(profiles.map(p => p.id));
    const orphanedAuthUsers = authUsers.filter(u => !profileIds.has(u.id));
    
    // 4. Cleanup orphaned users
    const results = {
      dryRun,
      orphanedUsersFound: orphanedAuthUsers.length,
      usersDeleted: 0,
      errors: [],
      deletedUsers: []
    };
    
    if (orphanedAuthUsers.length > 0) {
      if (dryRun) {
        results.message = `Found ${orphanedAuthUsers.length} orphaned users. Run with dryRun=false to delete them.`;
        results.orphanedUsers = orphanedAuthUsers.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at
        }));
      } else {
        // Actually delete the orphaned users
        for (const orphanedUser of orphanedAuthUsers) {
          try {
            // First check if there are any trips associated with this user (by user_id OR email)
            const { data: tripsByUserId } = await supabase
              .from('trips')
              .select('id')
              .eq('user_id', orphanedUser.id)
              .limit(1);
              
            const { data: tripsByEmail } = await supabase
              .from('trips')
              .select('id')
              .eq('email', orphanedUser.email)
              .limit(1);
              
            const hasTrips = (tripsByUserId && tripsByUserId.length > 0) || (tripsByEmail && tripsByEmail.length > 0);
              
            if (hasTrips) {
              results.errors.push({
                userId: orphanedUser.id,
                email: orphanedUser.email,
                error: 'Has associated trips, skipping deletion'
              });
              continue;
            }
            
            // Clean up dependent records before deleting the user
            try {
              // 1. Clean up any remaining references in other tables that might block deletion
              await supabase.from('invoices').delete().eq('user_id', orphanedUser.id);
              await supabase.from('vehicle_checkoffs').delete().eq('driver_id', orphanedUser.id);
              
              // 2. Clean up trips table references (set FK fields to NULL instead of deleting)
              await supabase.from('trips').update({ 
                driver_id: null,
                rejected_by_driver_id: null,
                booked_by: null,
                created_by: null,
                last_edited_by: null
              }).eq('driver_id', orphanedUser.id);
              
              await supabase.from('trips').update({ 
                rejected_by_driver_id: null 
              }).eq('rejected_by_driver_id', orphanedUser.id);
              
              await supabase.from('trips').update({ 
                booked_by: null 
              }).eq('booked_by', orphanedUser.id);
              
              await supabase.from('trips').update({ 
                created_by: null 
              }).eq('created_by', orphanedUser.id);
              
              await supabase.from('trips').update({ 
                last_edited_by: null 
              }).eq('last_edited_by', orphanedUser.id);
              
              // 3. Clean up audit logs and billing references
              await supabase.from('audit_logs').delete().eq('user_id', orphanedUser.id);
              await supabase.from('payment_lock_user').update({ payment_lock_user: null }).eq('payment_lock_user', orphanedUser.id);
              
            } catch (cleanupError) {
              console.warn('Warning: Some cleanup operations failed:', cleanupError.message);
            }
            
            // Delete the auth user
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphanedUser.id);
            
            if (deleteError) {
              console.error('Delete user error details:', {
                userId: orphanedUser.id,
                email: orphanedUser.email,
                error: deleteError,
                message: deleteError.message,
                code: deleteError.code,
                status: deleteError.status
              });
              
              results.errors.push({
                userId: orphanedUser.id,
                email: orphanedUser.email,
                error: `Database error deleting user${deleteError.message ? `: ${deleteError.message}` : ''}`
              });
            } else {
              results.usersDeleted++;
              results.deletedUsers.push({
                id: orphanedUser.id,
                email: orphanedUser.email
              });
            }
          } catch (error) {
            results.errors.push({
              userId: orphanedUser.id,
              email: orphanedUser.email,
              error: error.message
            });
          }
        }
        
        results.message = `Deleted ${results.usersDeleted} out of ${orphanedAuthUsers.length} orphaned users.`;
      }
    } else {
      results.message = 'No orphaned users found.';
    }
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (error) {
    console.error('Error in orphaned users cleanup:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}