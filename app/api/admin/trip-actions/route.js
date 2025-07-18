import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 Admin trip actions API called [${requestId}] at ${new Date().toISOString()}`);
  
  try {
    // Parse request body
    let body, tripId, action, reason;
    try {
      body = await request.json();
      ({ tripId, action, reason } = body);
      console.log(`📦 Request [${requestId}]:`, { tripId: tripId?.substring(0, 8) + '...', action, reason });
    } catch (parseError) {
      console.error(`❌ JSON parse error [${requestId}]:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError.message,
        requestId 
      }, { status: 400 });
    }
    
    if (!tripId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Both tripId and action are required',
        received: { tripId: !!tripId, action: !!action },
        requestId 
      }, { status: 400 });
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get and verify session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error(`❌ Authentication error [${requestId}]:`, userError);
      return NextResponse.json({
        error: 'Authentication required',
        details: 'Please log in to perform this action',
        requestId
      }, { status: 401 });
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(`❌ Profile error [${requestId}]:`, profileError);
      return NextResponse.json({
        error: 'Profile verification failed',
        details: profileError?.message || 'Profile not found',
        requestId
      }, { status: 403 });
    }

    if (profile.role !== 'admin') {
      console.error(`❌ Invalid role [${requestId}]: ${profile.role}`);
      return NextResponse.json({ 
        error: 'Access denied',
        details: `Admin role required. Current role: ${profile.role}`,
        requestId 
      }, { status: 403 });
    }

    console.log(`✅ Admin verified [${requestId}]: ${profile.first_name} ${profile.last_name}`);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError) {
      console.error(`❌ Trip query error [${requestId}]:`, tripError);
      if (tripError.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Trip not found',
          details: `No trip exists with ID: ${tripId}`,
          requestId
        }, { status: 404 });
      }
      return NextResponse.json({
        error: 'Database query failed',
        details: tripError.message,
        requestId
      }, { status: 500 });
    }

    if (!trip) {
      console.error(`❌ No trip data returned [${requestId}]`);
      return NextResponse.json({
        error: 'Trip not found',
        details: `No trip found with ID: ${tripId}`,
        requestId
      }, { status: 404 });
    }

    console.log(`✅ Trip found [${requestId}]: ${trip.id} - Status: ${trip.status}`);

    // Handle different actions
    console.log(`🔄 Processing action [${requestId}]: ${action} for trip ${trip.id}`);
    
    switch (action) {
      case 'approve':
        return await handleApprove(supabase, trip, requestId);
      case 'reject':
        return await handleReject(supabase, trip, reason, requestId);
      case 'complete':
        return await handleComplete(supabase, trip, requestId);
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          details: `Action '${action}' is not supported`,
          validActions: ['approve', 'reject', 'complete'],
          requestId 
        }, { status: 400 });
    }

  } catch (error) {
    console.error(`🚨 Unhandled error [${requestId}]:`, error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function handleApprove(supabase, trip, requestId) {
  console.log(`🔄 Approving trip [${requestId}]: ${trip.id}`);
  
  if (trip.status !== 'pending') {
    return NextResponse.json({
      error: 'Invalid status transition',
      details: `Cannot approve trip in status: ${trip.status}. Trip must be 'pending'.`,
      currentStatus: trip.status,
      requestId
    }, { status: 400 });
  }

  try {
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'upcoming',
        updated_at: new Date().toISOString()
      })
      .eq('id', trip.id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Approval update failed [${requestId}]:`, updateError);
      throw new Error(`Failed to approve trip: ${updateError.message}`);
    }

    console.log(`✅ Trip approved [${requestId}]: ${updatedTrip.id}`);
    
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip approved successfully',
      details: {
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        requestId
      }
    });
  } catch (error) {
    console.error(`❌ Error in handleApprove [${requestId}]:`, error);
    throw error;
  }
}

async function handleReject(supabase, trip, reason, requestId) {
  console.log(`🔄 Rejecting trip [${requestId}]: ${trip.id}`);
  
  const rejectionReason = reason || 'Rejected by admin';

  try {
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'cancelled',
        cancellation_reason: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', trip.id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Rejection update failed [${requestId}]:`, updateError);
      throw new Error(`Failed to reject trip: ${updateError.message}`);
    }

    console.log(`✅ Trip rejected [${requestId}]: ${updatedTrip.id}`);
    
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip rejected successfully',
      details: {
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        reason: rejectionReason,
        requestId
      }
    });
  } catch (error) {
    console.error(`❌ Error in handleReject [${requestId}]:`, error);
    throw error;
  }
}

async function handleComplete(supabase, trip, requestId) {
  console.log(`🔄 Completing trip [${requestId}]: ${trip.id}`);
  console.log(`   Current status: ${trip.status}`);
  
  // Allow completion from multiple statuses including in_progress
  const allowedStatuses = ['upcoming', 'in_progress', 'paid_in_progress', 'approved_pending_payment', 'in_process'];
  if (!allowedStatuses.includes(trip.status)) {
    console.error(`❌ Invalid status for completion [${requestId}]: ${trip.status}`);
    return NextResponse.json({
      error: 'Invalid status transition',
      details: `Cannot complete trip in status: ${trip.status}. Allowed statuses: ${allowedStatuses.join(', ')}`,
      currentStatus: trip.status,
      allowedStatuses,
      requestId
    }, { status: 400 });
  }

  try {
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', trip.id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Completion update failed [${requestId}]:`, updateError);
      throw new Error(`Failed to complete trip: ${updateError.message}`);
    }

    if (!updatedTrip) {
      console.error(`❌ No trip returned after completion [${requestId}]`);
      throw new Error('Trip update succeeded but no data returned');
    }

    // Update driver status back to available if there was a driver assigned
    if (trip.driver_id) {
      try {
        const { error: driverUpdateError } = await supabase
          .from('profiles')
          .update({ 
            status: 'available',
            updated_at: new Date().toISOString()
          })
          .eq('id', trip.driver_id);

        if (driverUpdateError) {
          console.warn(`⚠️ Driver status update failed [${requestId}]:`, driverUpdateError);
          // Don't fail the trip completion if driver update fails
        } else {
          console.log(`✅ Driver status updated to available [${requestId}]: ${trip.driver_id}`);
        }
      } catch (driverUpdateErr) {
        console.warn(`⚠️ Driver status update error [${requestId}]:`, driverUpdateErr);
      }
    }

    console.log(`✅ Trip completed [${requestId}]: ${updatedTrip.id}`);
    
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip completed successfully',
      details: {
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        updatedAt: updatedTrip.updated_at,
        requestId
      }
    });
  } catch (error) {
    console.error(`❌ Error in handleComplete [${requestId}]:`, error);
    throw error;
  }
}