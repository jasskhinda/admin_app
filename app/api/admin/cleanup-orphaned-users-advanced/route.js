import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { 
      dryRun = true, 
      deleteTrips = false, 
      archiveTrips = false,
      selectedUsers = [] 
    } = body;
    
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
    
    // Get all auth users if no specific users selected
    let usersToProcess = [];
    
    if (selectedUsers.length > 0) {
      // Process specific users
      const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        return NextResponse.json({ error: 'Error fetching auth users', details: authError }, { status: 500 });
      }
      
      usersToProcess = authUsers.filter(u => selectedUsers.includes(u.id));
    } else {
      // Get all orphaned users
      const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        return NextResponse.json({ error: 'Error fetching auth users', details: authError }, { status: 500 });
      }
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');
        
      if (profilesError) {
        return NextResponse.json({ error: 'Error fetching profiles', details: profilesError }, { status: 500 });
      }
      
      const profileIds = new Set(profiles.map(p => p.id));
      usersToProcess = authUsers.filter(u => !profileIds.has(u.id));
    }
    
    // Results tracking
    const results = {
      dryRun,
      deleteTrips,
      archiveTrips,
      usersProcessed: 0,
      usersDeleted: 0,
      tripsDeleted: 0,
      tripsArchived: 0,
      errors: [],
      processedUsers: [],
      skippedUsers: [],
      usersRequiringDispatcherReview: [],
      safeDeletionUsers: []
    };
    
    for (const orphanedUser of usersToProcess) {
      results.usersProcessed++;
      
      try {
        // Get detailed trip information for this user
        const { data: userTrips } = await supabase
          .from('trips')
          .select('id, status, pickup_time, pickup_address, destination_address, created_at, pickup_datetime')
          .eq('user_id', orphanedUser.id);
          
        const { data: managedTrips } = await supabase
          .from('trips')
          .select('id, status, pickup_time, pickup_address, destination_address, created_at, pickup_datetime')
          .or(`email.eq.${orphanedUser.email}`);
        
        const allTrips = [...(userTrips || []), ...(managedTrips || [])];
        const tripCount = allTrips.length;
        
        // Categorize trips by status and urgency
        const now = new Date();
        const pendingTrips = allTrips.filter(trip => 
          ['pending', 'confirmed', 'assigned', 'in_progress'].includes(trip.status)
        );
        const upcomingTrips = allTrips.filter(trip => {
          const pickupDate = new Date(trip.pickup_datetime || trip.pickup_time);
          return pickupDate > now && !['cancelled', 'completed', 'archived'].includes(trip.status);
        });
        const completedTrips = allTrips.filter(trip => 
          ['completed', 'cancelled'].includes(trip.status)
        );
        
        // Get user profile info for better identification
        let userDisplayInfo = {
          name: 'Unknown User',
          email: orphanedUser.email,
          phone: 'N/A'
        };
        
        // Try to get additional info from managed clients or any other source
        if (orphanedUser.email) {
          const { data: managedClient } = await supabase
            .from('facility_managed_clients')
            .select('first_name, last_name, phone_number, email, facility_id')
            .eq('email', orphanedUser.email)
            .single();
            
          if (managedClient) {
            userDisplayInfo = {
              name: `${managedClient.first_name || ''} ${managedClient.last_name || ''}`.trim() || 'Unknown User',
              email: managedClient.email,
              phone: managedClient.phone_number || 'N/A',
              facility_id: managedClient.facility_id
            };
          }
        }
        
        const userInfo = {
          id: orphanedUser.id,
          email: orphanedUser.email,
          displayName: userDisplayInfo.name,
          phone: userDisplayInfo.phone,
          facility_id: userDisplayInfo.facility_id,
          tripCount,
          pendingTripsCount: pendingTrips.length,
          upcomingTripsCount: upcomingTrips.length,
          completedTripsCount: completedTrips.length,
          lastSignIn: orphanedUser.last_sign_in_at,
          action: 'none',
          canDelete: false,
          requiresDispatcherReview: false,
          pendingTripDetails: pendingTrips.map(trip => ({
            id: trip.id,
            status: trip.status,
            pickup: trip.pickup_address,
            destination: trip.destination_address,
            pickup_time: trip.pickup_datetime || trip.pickup_time
          })),
          upcomingTripDetails: upcomingTrips.map(trip => ({
            id: trip.id,
            status: trip.status,
            pickup: trip.pickup_address,
            destination: trip.destination_address,
            pickup_time: trip.pickup_datetime || trip.pickup_time
          }))
        };
        
        if (dryRun) {
          // Determine what would happen based on trip status
          if (pendingTrips.length > 0 || upcomingTrips.length > 0) {
            userInfo.requiresDispatcherReview = true;
            userInfo.canDelete = false;
            userInfo.action = `REQUIRES DISPATCHER REVIEW - ${pendingTrips.length} pending, ${upcomingTrips.length} upcoming trips`;
            results.usersRequiringDispatcherReview.push(userInfo);
          } else if (completedTrips.length > 0) {
            userInfo.canDelete = true;
            if (deleteTrips) {
              userInfo.action = `Would delete user and ${completedTrips.length} completed trips`;
            } else if (archiveTrips) {
              userInfo.action = `Would archive ${completedTrips.length} completed trips and delete user`;
            } else {
              userInfo.action = `Would skip (has ${completedTrips.length} completed trips)`;
            }
            results.safeDeletionUsers.push(userInfo);
          } else if (tripCount === 0) {
            userInfo.canDelete = true;
            userInfo.action = 'Would delete user (no trips)';
            results.safeDeletionUsers.push(userInfo);
          } else {
            userInfo.action = `Would skip (${tripCount} trips need review)`;
            results.skippedUsers.push(userInfo);
          }
        } else {
          // Actually perform the cleanup - but NEVER delete users with pending/upcoming trips
          if (pendingTrips.length > 0 || upcomingTrips.length > 0) {
            userInfo.requiresDispatcherReview = true;
            userInfo.canDelete = false;
            userInfo.action = `BLOCKED - Has ${pendingTrips.length} pending and ${upcomingTrips.length} upcoming trips. Contact dispatchers first.`;
            results.skippedUsers.push(userInfo);
            continue;
          }
          
          if (completedTrips.length > 0 && !deleteTrips && !archiveTrips) {
            userInfo.action = `Skipped (has ${completedTrips.length} completed trips)`;
            results.skippedUsers.push(userInfo);
            continue;
          }
          
          // Handle completed trips only
          if (completedTrips.length > 0) {
            if (deleteTrips) {
              // Delete all trips for this user
              const { error: deleteTripsError } = await supabase
                .from('trips')
                .delete()
                .eq('user_id', orphanedUser.id);
                
              if (!deleteTripsError) {
                // Also delete trips by email if any
                const { error: deleteEmailTripsError } = await supabase
                  .from('trips')
                  .delete()
                  .eq('email', orphanedUser.email);
                  
                results.tripsDeleted += tripCount;
                userInfo.action = `Deleted ${tripCount} trips`;
              } else {
                results.errors.push({
                  userId: orphanedUser.id,
                  email: orphanedUser.email,
                  error: `Failed to delete trips: ${deleteTripsError.message}`
                });
                continue;
              }
            } else if (archiveTrips) {
              // Archive trips by updating them with archived status
              const archiveDate = new Date().toISOString();
              const { error: archiveError } = await supabase
                .from('trips')
                .update({ 
                  status: 'archived',
                  archived_at: archiveDate,
                  archived_reason: 'User cleanup - orphaned account'
                })
                .eq('user_id', orphanedUser.id);
                
              if (!archiveError) {
                // Also archive trips by email
                await supabase
                  .from('trips')
                  .update({ 
                    status: 'archived',
                    archived_at: archiveDate,
                    archived_reason: 'User cleanup - orphaned account'
                  })
                  .eq('email', orphanedUser.email);
                  
                results.tripsArchived += tripCount;
                userInfo.action = `Archived ${tripCount} trips`;
              } else {
                results.errors.push({
                  userId: orphanedUser.id,
                  email: orphanedUser.email,
                  error: `Failed to archive trips: ${archiveError.message}`
                });
                continue;
              }
            }
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
          
          // Now delete the user
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
              error: `Failed to delete user: ${deleteError.message || deleteError.error_description || 'Database error deleting user'} (Code: ${deleteError.code || 'unexpected_failure'})`
            });
          } else {
            results.usersDeleted++;
            userInfo.action += ' and deleted user';
            results.processedUsers.push(userInfo);
          }
        }
      } catch (error) {
        results.errors.push({
          userId: orphanedUser.id,
          email: orphanedUser.email,
          error: error.message
        });
      }
    }
    
    // Generate summary message
    if (dryRun) {
      results.message = `Dry run complete. Found ${usersToProcess.length} orphaned users. ` +
        `${results.processedUsers.length} would be processed, ${results.skippedUsers.length} would be skipped.`;
    } else {
      results.message = `Cleanup complete. Processed ${results.usersProcessed} users. ` +
        `Deleted ${results.usersDeleted} users, ${results.tripsDeleted} trips deleted, ${results.tripsArchived} trips archived.`;
    }
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (error) {
    console.error('Error in advanced orphaned users cleanup:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}