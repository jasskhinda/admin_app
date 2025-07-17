import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get request body
    const body = await request.json();
    const { email, first_name, last_name, phone_number, vehicle_model, vehicle_license, status, password } = body;
    
    // Update driver profile
    const { data: updatedDriver, error: updateError } = await supabase
      .from('profiles')
      .update({
        email,
        first_name,
        last_name,
        phone_number,
        vehicle_model,
        vehicle_license,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('role', 'driver')
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating driver:', updateError);
      return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
    }
    
    // Also update the auth user's email and/or password if changed
    try {
      const { supabaseAdmin } = await import('@/lib/admin-supabase');
      if (supabaseAdmin) {
        const authUpdateData = {};
        
        // Update email if changed
        if (email !== updatedDriver.email) {
          authUpdateData.email = email;
        }
        
        // Update password if provided
        if (password) {
          authUpdateData.password = password;
        }
        
        // Only make the API call if there's something to update
        if (Object.keys(authUpdateData).length > 0) {
          await supabaseAdmin.auth.admin.updateUserById(params.id, authUpdateData);
        }
      }
    } catch (authError) {
      console.warn('Could not update auth user:', authError);
      // Don't fail the entire request if auth update fails
    }
    
    return NextResponse.json({ driver: updatedDriver });
    
  } catch (error) {
    console.error('Error in PUT /api/drivers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Check if driver has any active trips
    const { data: activeTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id')
      .eq('driver_id', params.id)
      .in('status', ['upcoming', 'in_progress']);
    
    if (tripsError) {
      console.error('Error checking active trips:', tripsError);
      return NextResponse.json({ error: 'Failed to check active trips' }, { status: 500 });
    }
    
    if (activeTrips && activeTrips.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete driver with active trips. Please reassign or complete their trips first.' 
      }, { status: 400 });
    }
    
    // Delete the driver profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id)
      .eq('role', 'driver');
    
    if (deleteError) {
      console.error('Error deleting driver:', deleteError);
      return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
    }
    
    // Also delete the auth user
    try {
      const { supabaseAdmin } = await import('@/lib/admin-supabase');
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.deleteUser(params.id);
      }
    } catch (authError) {
      console.warn('Could not delete auth user:', authError);
    }
    
    return NextResponse.json({ message: 'Driver deleted successfully' });
    
  } catch (error) {
    console.error('Error in DELETE /api/drivers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}