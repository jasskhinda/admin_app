import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID required' }, { status: 400 });
    }
    
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
    
    // Get admin client for user deletion
    const { supabaseAdmin } = await import('@/lib/admin-supabase');
    if (!supabaseAdmin) {
      throw new Error('Admin client not available');
    }
    
    // Check if driver exists
    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', driverId)
      .eq('role', 'driver')
      .single();
      
    if (driverError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    console.log(`Starting deletion process for driver: ${driverId} (${driver.email})`);
    
    // Check for active trips assigned to this driver
    let hasActiveTrips = false;
    try {
      const { data: activeTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id, status, created_at')
        .eq('driver_id', driverId)
        .in('status', ['pending', 'confirmed', 'in_progress']);
        
      if (tripsError) {
        console.error('Trips query error:', {
          message: tripsError.message,
          code: tripsError.code,
          details: tripsError.details,
          hint: tripsError.hint
        });
        
        // Check if it's a table not found error or column not found
        if (tripsError.code === '42P01' || tripsError.message?.includes('does not exist')) {
          console.log('Trips table or columns not found, proceeding without trip validation');
        } else {
          return NextResponse.json({ 
            error: `Error checking driver trips: ${tripsError.message}`,
            details: tripsError.code 
          }, { status: 500 });
        }
      } else if (activeTrips && activeTrips.length > 0) {
        hasActiveTrips = true;
        console.log(`Found ${activeTrips.length} active trips for driver`);
      }
    } catch (error) {
      console.warn('Could not check trips (table may not exist):', error.message);
    }
    
    if (hasActiveTrips) {
      return NextResponse.json({ 
        error: 'Cannot delete driver with active trips. Please reassign or complete all active trips first.',
        details: 'Driver has pending, confirmed, or in-progress trips'
      }, { status: 400 });
    }
    
    // Clean up related data
    
    // Try to delete completed trips (ignore errors for non-existent tables)
    try {
      await supabase
        .from('trips')
        .delete()
        .eq('driver_id', driverId);
      console.log('Deleted completed trips for driver');
    } catch (error) {
      console.warn('Could not delete trips:', error.message);
    }
    
    // Try to delete vehicle assignment (ignore errors for non-existent tables)
    try {
      await supabase
        .from('vehicles')
        .delete()
        .eq('driver_id', driverId);
      console.log('Deleted vehicle assignment for driver');
    } catch (error) {
      console.warn('Could not delete vehicle assignment:', error.message);
    }
    
    // Try to delete driver documents (ignore errors for non-existent tables)
    try {
      await supabase
        .from('driver_documents')
        .delete()
        .eq('driver_id', driverId);
      console.log('Deleted driver documents');
    } catch (error) {
      console.warn('Could not delete driver documents:', error.message);
    }
    
    // Try to delete driver ratings/reviews (ignore errors for non-existent tables)
    try {
      await supabase
        .from('driver_ratings')
        .delete()
        .eq('driver_id', driverId);
      console.log('Deleted driver ratings');
    } catch (error) {
      console.warn('Could not delete driver ratings:', error.message);
    }
    
    // Delete profile record
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', driverId);
      
    if (profileDeleteError) {
      console.error('Error deleting driver profile:', profileDeleteError);
      return NextResponse.json({ error: 'Error deleting driver profile' }, { status: 500 });
    }
    
    // Delete auth user
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(driverId);
      
      if (authDeleteError) {
        console.warn('Error deleting auth user:', authDeleteError);
        // Don't fail here as profile is already deleted
      } else {
        console.log('Successfully deleted auth user');
      }
    } catch (error) {
      console.warn('Exception deleting auth user:', error);
    }
    
    console.log(`Successfully deleted driver: ${driverId}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Driver successfully deleted',
      details: {
        driverId,
        driverName: `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
        driverEmail: driver.email
      }
    });
    
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}