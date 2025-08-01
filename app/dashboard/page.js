import { redirect } from 'next/navigation';
import AdminDashboardView from './AdminDashboardView';
import { createClient } from '@/utils/supabase/server';

export default async function AdminDashboard() {
  const supabase = await createClient();
  
  try {
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Dashboard auth error:', userError);
      redirect('/login?error=Authentication%20error');
    }
    
    // Get user profile to verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      redirect('/login?error=Profile%20error');
    }
    
    if (!profile || profile.role !== 'admin') {
      console.log('Not an admin in dashboard check');
      // The middleware should have caught this, but just in case
      redirect('/login?error=Admin%20access%20required');
    }
    
    console.log('Admin authenticated in dashboard, profile ID:', profile.id);
  } catch (error) {
    console.error('Unexpected dashboard auth error:', error);
    redirect('/login?error=Unexpected%20error');
  }
  
  // Fetch all profiles and count roles on the client side
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('role');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }
  
  // Count users by role
  const userCounts = profiles ? 
    Object.entries(
      profiles.reduce((acc, profile) => {
        const role = profile.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {})
    ).map(([role, count]) => ({ role, count })) 
    : [];
  
  // Fetch recent trips for the dashboard with client information
  const { data: recentTrips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  // Fetch additional data for trips
  let enrichedTrips = [];
  if (recentTrips && recentTrips.length > 0) {
    // Get unique user IDs, facility IDs, and managed client IDs
    const userIds = [...new Set(recentTrips.filter(t => t.user_id).map(t => t.user_id))];
    const facilityIds = [...new Set(recentTrips.filter(t => t.facility_id).map(t => t.facility_id))];
    const managedClientIds = [...new Set(recentTrips.filter(t => t.managed_client_id).map(t => t.managed_client_id))];
    
    // Fetch user profiles
    let userProfiles = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, email')
        .in('id', userIds);
      
      if (profiles) {
        profiles.forEach(p => userProfiles[p.id] = p);
      }
    }
    
    // Fetch facilities
    let facilitiesData = {};
    if (facilityIds.length > 0) {
      const { data: facs } = await supabase
        .from('facilities')
        .select('id, name')
        .in('id', facilityIds);
      
      if (facs) {
        facs.forEach(f => facilitiesData[f.id] = f);
      }
    }
    
    // Fetch managed clients
    let managedClients = {};
    if (managedClientIds.length > 0) {
      const { data: clients } = await supabase
        .from('facility_managed_clients')
        .select('id, first_name, last_name, email')
        .in('id', managedClientIds);
      
      if (clients) {
        clients.forEach(c => managedClients[c.id] = c);
      }
    }
    
    // Enrich trips with related data
    enrichedTrips = recentTrips.map(trip => ({
      ...trip,
      user_profile: trip.user_id ? userProfiles[trip.user_id] : null,
      facility: trip.facility_id ? facilitiesData[trip.facility_id] : null,
      managed_client: trip.managed_client_id ? managedClients[trip.managed_client_id] : null
    }));
  }
  
  if (tripsError) {
    console.error('Error fetching recent trips:', tripsError);
  }
  
  
  // Fetch pending driver verifications
  const { data: pendingDrivers, error: pendingDriversError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'driver')
    .eq('status', 'pending_verification')
    .limit(5);
  
  if (pendingDriversError) {
    console.error('Error fetching pending drivers:', pendingDriversError);
  }
  
  // Get user profile for the component
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', (await supabase.auth.getUser()).data.user.id)
    .single();
  
  // Fetch facilities for dashboard stats
  const { data: facilities, error: facilitiesError } = await supabase
    .from('facilities')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (facilitiesError) {
    console.error('Error fetching facilities:', facilitiesError);
  }
  
  return (
    <AdminDashboardView 
      userCounts={userCounts || []} 
      recentTrips={enrichedTrips || []} 
      pendingDrivers={pendingDrivers || []}
      userProfile={userProfile}
      facilities={facilities || []}
    />
  );
}