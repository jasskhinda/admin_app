import { redirect } from 'next/navigation';
import AdminFacilitiesView from './AdminFacilitiesView';
import { createClient } from '@/utils/supabase/server';

export default async function FacilitiesPage() {
  const supabase = await createClient();
  
  try {
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Facilities page auth error:', userError);
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
      console.log('Not an admin in facilities page');
      redirect('/login?error=Admin%20access%20required');
    }
    
    // Fetch facilities with aggregated data
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select(`
        *,
        clients:clients(count),
        trips:trips(count)
      `);
    
    if (facilitiesError) {
      console.error('Error fetching facilities:', facilitiesError);
    }
    
    // Process facilities data to include counts
    const processedFacilities = (facilities || []).map(facility => ({
      ...facility,
      client_count: facility.clients?.[0]?.count || 0,
      trip_count: facility.trips?.[0]?.count || 0,
      active_users: 0 // Can be enhanced later to count active facility users
    }));
    
    console.log('Fetched facilities:', processedFacilities.length);
    
    return (
      <AdminFacilitiesView 
        user={user}
        userProfile={profile}
        facilities={processedFacilities}
      />
    );
    
  } catch (error) {
    console.error('Unexpected facilities page error:', error);
    redirect('/login?error=Unexpected%20error');
  }
}