import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get request body
    const { first_name, last_name, email, phone_number, password } = await request.json();
    
    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    
    // Validate password if provided
    if (password && password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }
    
    // Check if dispatcher exists
    const { data: existingDispatcher, error: dispatcherError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .eq('role', 'dispatcher')
      .single();
    
    if (dispatcherError || !existingDispatcher) {
      return NextResponse.json({ error: 'Dispatcher not found' }, { status: 404 });
    }
    
    // Update dispatcher profile
    const { data: updatedDispatcher, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name,
        last_name,
        email,
        phone_number,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('role', 'dispatcher')
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating dispatcher:', updateError);
      return NextResponse.json({ error: 'Failed to update dispatcher' }, { status: 500 });
    }
    
    // Update Supabase Auth user if email or password changed
    if (email !== existingDispatcher.email || password) {
      try {
        const adminSupabase = createAdminClient();
        const authUpdateData = {};
        
        if (email !== existingDispatcher.email) {
          authUpdateData.email = email;
        }
        
        if (password) {
          authUpdateData.password = password;
        }
        
        console.log('Updating auth user with admin client:', { userId: params.id, hasPassword: !!password, hasEmail: !!authUpdateData.email });
        
        const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(
          params.id,
          authUpdateData
        );
        
        if (authUpdateError) {
          console.error('Error updating auth user:', authUpdateError);
          return NextResponse.json({ error: `Failed to update authentication: ${authUpdateError.message}` }, { status: 500 });
        } else {
          console.log('✅ Auth user updated successfully');
        }
      } catch (authError) {
        console.error('Error updating auth user:', authError);
        return NextResponse.json({ error: `Failed to update authentication: ${authError.message}` }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      message: 'Dispatcher updated successfully',
      dispatcher: updatedDispatcher
    });
    
  } catch (error) {
    console.error('Error in PUT /api/dispatchers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Check if dispatcher exists
    const { data: existingDispatcher, error: dispatcherError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .eq('role', 'dispatcher')
      .single();
    
    if (dispatcherError || !existingDispatcher) {
      return NextResponse.json({ error: 'Dispatcher not found' }, { status: 404 });
    }
    
    // Check if dispatcher has any active trips (check both created_by and any other possible dispatcher relationships)
    const adminSupabase = createAdminClient();
    const { data: activeTrips, error: tripsError } = await adminSupabase
      .from('trips')
      .select('id')
      .eq('created_by', params.id)
      .in('status', ['pending', 'upcoming', 'in_progress']);
    
    if (tripsError) {
      console.error('Error checking active trips:', tripsError);
      return NextResponse.json({ error: 'Failed to check active trips' }, { status: 500 });
    }
    
    if (activeTrips && activeTrips.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete dispatcher. They have ${activeTrips.length} active trip(s). Please reassign or complete these trips first.`
      }, { status: 400 });
    }
    
    // Step 1: First, try to delete any related data that might reference this user
    console.log('🔄 Step 1: Cleaning up related data...');
    
    try {
      // Check for any other tables that might reference this user ID
      // This is a safety measure to avoid foreign key constraint errors
      
      // Update any trips that might reference this user in other fields
      const { error: tripUpdateError } = await adminSupabase
        .from('trips')
        .update({ created_by: null })
        .eq('created_by', params.id);
      
      if (tripUpdateError) {
        console.log('⚠️ Note: Could not update trip references:', tripUpdateError.message);
      } else {
        console.log('✅ Trip references cleaned up');
      }
      
    } catch (cleanupError) {
      console.log('⚠️ Note: Cleanup step had issues:', cleanupError.message);
    }
    
    // Step 2: Delete the auth user first (this often has fewer constraints)
    console.log('🔄 Step 2: Deleting auth user...');
    try {
      const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(params.id);
      
      if (authDeleteError) {
        console.error('❌ Error deleting auth user:', authDeleteError);
        return NextResponse.json({ 
          error: `Failed to delete user from authentication system: ${authDeleteError.message}` 
        }, { status: 500 });
      } else {
        console.log('✅ Auth user deleted successfully');
      }
    } catch (authError) {
      console.error('❌ Exception deleting auth user:', authError);
      return NextResponse.json({ 
        error: `Failed to delete user from authentication system: ${authError.message}` 
      }, { status: 500 });
    }
    
    // Step 3: Delete the dispatcher profile (use admin client)
    console.log('🔄 Step 3: Deleting dispatcher profile...');
    const { error: deleteError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', params.id)
      .eq('role', 'dispatcher');
    
    if (deleteError) {
      console.error('❌ Error deleting dispatcher profile:', deleteError);
      return NextResponse.json({ 
        error: `Failed to delete dispatcher profile: ${deleteError.message}` 
      }, { status: 500 });
    }
    
    console.log('✅ Dispatcher profile deleted successfully');
    
    return NextResponse.json({ 
      message: 'Dispatcher deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/dispatchers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}