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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get admin client
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
    }

    // Get all users with their profiles
    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Categorize users
    const adminUsers = allProfiles?.filter(p => p.role === 'admin') || [];
    const dispatcherUsers = allProfiles?.filter(p => p.role === 'dispatcher') || [];
    const facilityUsers = allProfiles?.filter(p => p.role === 'facility') || [];
    const clientUsers = allProfiles?.filter(p => p.role === 'client') || [];
    const driverUsers = allProfiles?.filter(p => p.role === 'driver') || [];
    const otherUsers = allProfiles?.filter(p => !['admin', 'dispatcher', 'facility', 'client', 'driver'].includes(p.role)) || [];

    // Users to keep (admin and dispatcher)
    const usersToKeep = [...adminUsers, ...dispatcherUsers];
    
    // Users to delete (everyone else)
    const usersToDelete = [...facilityUsers, ...clientUsers, ...driverUsers, ...otherUsers];

    // Get role counts
    const roleCounts = {
      admin: adminUsers.length,
      dispatcher: dispatcherUsers.length,
      facility: facilityUsers.length,
      client: clientUsers.length,
      driver: driverUsers.length,
      other: otherUsers.length
    };

    return NextResponse.json({
      success: true,
      usersToKeep,
      usersToDelete,
      totalUsers: allProfiles?.length || 0,
      roleCounts,
      summary: {
        keep: usersToKeep.length,
        delete: usersToDelete.length
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get admin client
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
    }

    // Get users to delete (everyone except admin and dispatcher)
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .not('role', 'in', '("admin","dispatcher")');

    if (!allProfiles || allProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to delete - only admin and dispatcher accounts remain',
        usersDeleted: 0,
        errors: []
      });
    }

    let deletedCount = 0;
    let errors = [];

    // Delete each user
    for (const userProfile of allProfiles) {
      try {
        console.log(`Deleting user: ${userProfile.first_name} ${userProfile.last_name} (${userProfile.email})`);
        
        // Delete from facility_users first (if exists)
        await supabaseAdmin
          .from('facility_users')
          .delete()
          .eq('user_id', userProfile.id);

        // Delete profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userProfile.id);

        if (profileError) {
          console.error(`Profile deletion failed for ${userProfile.email}:`, profileError);
          errors.push({ email: userProfile.email, error: profileError.message });
          continue;
        }

        // Delete from auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userProfile.id);

        if (authError) {
          console.error(`Auth deletion failed for ${userProfile.email}:`, authError);
          errors.push({ email: userProfile.email, error: authError.message });
        } else {
          deletedCount++;
        }

      } catch (error) {
        console.error(`Unexpected error deleting ${userProfile.email}:`, error);
        errors.push({ email: userProfile.email, error: error.message });
      }
    }

    // Verify remaining users
    const { data: remainingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .in('role', ['admin', 'dispatcher']);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} users. ${errors.length} errors encountered.`,
      usersDeleted: deletedCount,
      errors,
      remainingAdminUsers: remainingProfiles?.length || 0
    });

  } catch (error) {
    console.error('Error deleting users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}