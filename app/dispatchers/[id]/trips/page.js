import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DispatcherTripsView from './DispatcherTripsView';

export default async function DispatcherTripsPage({ params }) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login?error=Authentication%20required');
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
  
  // Get dispatcher details
  const { data: dispatcher, error: dispatcherError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .eq('role', 'dispatcher')
    .single();
  
  if (dispatcherError || !dispatcher) {
    redirect('/dispatchers?error=Dispatcher%20not%20found');
  }
  
  // Get dispatcher's trips with client information
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select(`
      *,
      user_profile:profiles(first_name, last_name, phone_number, email),
      facility:facilities(id, name, contact_email, phone_number)
    `)
    .eq('dispatcher_id', params.id)
    .order('created_at', { ascending: false });
  
  if (tripsError) {
    console.error('Error fetching dispatcher trips:', tripsError);
  }
  
  return (
    <DispatcherTripsView 
      user={user} 
      userProfile={profile} 
      dispatcher={dispatcher}
      trips={trips || []}
    />
  );
}