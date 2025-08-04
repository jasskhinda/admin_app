import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import FacilityDetailsView from './FacilityDetailsView';

export default async function FacilityDetailsPage({ params }) {
  const supabase = await createClient();
  
  try {
    // Get the user and verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      redirect('/login?error=Authentication%20error');
    }
    
    // Get user profile to verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      redirect('/login?error=Admin%20access%20required');
    }
    
    // Get facility details
    let facility = null;
    let facilityError = null;
    
    try {
      const { data: facilityData, error: facilityErr } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (facilityErr) {
        // Try with admin client
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
          const { data: adminFacility, error: adminErr } = await supabaseAdmin
            .from('facilities')
            .select('*')
            .eq('id', params.id)
            .single();
          
          if (adminErr) {
            facilityError = adminErr;
          } else {
            facility = adminFacility;
          }
        } else {
          facilityError = facilityErr;
        }
      } else {
        facility = facilityData;
      }
    } catch (error) {
      console.error('Error fetching facility:', error);
      facilityError = error;
    }
    
    if (!facility) {
      redirect('/facilities?error=Facility%20not%20found');
    }
    
    // Get facility statistics
    let stats = {
      client_count: 0,
      trip_count: 0,
      monthly_revenue: 0,
      recent_trips: []
    };
    
    try {
      // Get client count from facility_managed_clients table
      const { count: clientCount } = await supabase
        .from('facility_managed_clients')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);
      
      // Get trip count
      const { count: tripCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);
      
      // Remove active users count - not needed
      
      // Get recent trips (will need to fetch client info separately)
      const { data: recentTrips } = await supabase
        .from('trips')
        .select('*')
        .eq('facility_id', facility.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Process each trip to add client information
      if (recentTrips && recentTrips.length > 0) {
        for (const trip of recentTrips) {
          // If trip has managed_client_id, get info from facility_managed_clients
          if (trip.managed_client_id) {
            const { data: managedClient } = await supabase
              .from('facility_managed_clients')
              .select('id, first_name, last_name, email')
              .eq('id', trip.managed_client_id)
              .single();
            
            if (managedClient) {
              trip.client_info = {
                type: 'facility_managed',
                name: `${managedClient.first_name || ''} ${managedClient.last_name || ''}`.trim(),
                email: managedClient.email,
                ...managedClient
              };
            }
          }
          // If trip has user_id, get info from profiles table  
          else if (trip.user_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, full_name, email')
              .eq('id', trip.user_id)
              .single();
            
            if (userProfile) {
              trip.client_info = {
                type: 'individual',
                name: userProfile.full_name || `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(),
                email: userProfile.email,
                ...userProfile
              };
            }
          }
          
          // Fallback if no client info found
          if (!trip.client_info) {
            trip.client_info = {
              type: 'unknown',
              name: 'Unknown Client',
              email: 'N/A'
            };
          }
        }
      }
      
      stats = {
        client_count: clientCount || 0,
        trip_count: tripCount || 0,
        monthly_revenue: 0, // Will calculate this later
        recent_trips: recentTrips || []
      };
    } catch (error) {
      console.error('Error fetching facility stats:', error);
    }
    
    return (
      <FacilityDetailsView 
        user={user}
        userProfile={profile}
        facility={facility}
        stats={stats}
      />
    );
    
  } catch (error) {
    console.error('Unexpected facility details error:', error);
    redirect('/facilities?error=Unexpected%20error');
  }
}