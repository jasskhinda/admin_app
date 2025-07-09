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
      active_users: 0,
      monthly_revenue: 0,
      recent_trips: []
    };
    
    try {
      // Get client count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);
      
      // Get trip count
      const { count: tripCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);
      
      // Get active users count
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id)
        .eq('status', 'active');
      
      // Get recent trips
      const { data: recentTrips } = await supabase
        .from('trips')
        .select(`
          *,
          clients (
            first_name,
            last_name
          )
        `)
        .eq('facility_id', facility.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      stats = {
        client_count: clientCount || 0,
        trip_count: tripCount || 0,
        active_users: activeUsers || 0,
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