import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import FacilityClientsView from './FacilityClientsView';

export default async function FacilityClientsPage({ params }) {
  const supabase = await createClient();
  
  // Get the user - always use getUser for security
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }
  
  // Get user profile to verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login');
  }

  // Get facility data
  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', params.id)
    .single();

  if (facilityError || !facility) {
    redirect('/facilities');
  }

  // Get clients for this facility - fetch from profiles table
  const { data: clients, error: clientsError } = await supabase
    .from('profiles')
    .select('*')
    .eq('facility_id', params.id)
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  // Get trips count for each client
  const clientsWithCounts = await Promise.all((clients || []).map(async (client) => {
    const { count: tripCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', client.id);
    
    return {
      ...client,
      user_id: client.id, // Add user_id for compatibility
      trip_count: tripCount || 0
    };
  }));
  
  return (
    <FacilityClientsView 
      facility={facility} 
      clients={clientsWithCounts}
      user={user}
      userProfile={profile}
    />
  );
}