import { createClient } from '@/utils/supabase/server';
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
        const authUpdateData = {};
        
        if (email !== existingDispatcher.email) {
          authUpdateData.email = email;
        }
        
        if (password) {
          authUpdateData.password = password;
        }
        
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
          params.id,
          authUpdateData
        );
        
        if (authUpdateError) {
          console.error('Error updating auth user:', authUpdateError);
          // Don't fail the request for auth update errors, just log them
        }
      } catch (authError) {
        console.error('Error updating auth user:', authError);
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
    
    // Check if dispatcher has any active trips
    const { data: activeTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id')
      .eq('dispatcher_id', params.id)
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
    
    // Delete the dispatcher profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id)
      .eq('role', 'dispatcher');
    
    if (deleteError) {
      console.error('Error deleting dispatcher:', deleteError);
      return NextResponse.json({ error: 'Failed to delete dispatcher' }, { status: 500 });
    }
    
    // Try to delete the auth user (optional, may fail if user signed up independently)
    try {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(params.id);
      
      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // Don't fail the request for auth delete errors, just log them
      }
    } catch (authError) {
      console.error('Error deleting auth user:', authError);
    }
    
    return NextResponse.json({ 
      message: 'Dispatcher deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/dispatchers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}