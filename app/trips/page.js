import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminTripsView from './AdminTripsView';

export default async function TripsPage() {
  const supabase = await createClient();
  
  // Check authentication and admin role
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
  
  // Fetch all trips with client information
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select(`
      *,
      user_profile:user_id (
        id,
        first_name,
        last_name,
        full_name,
        email,
        phone_number
      ),
      managed_client:managed_client_id!facility_managed_clients (
        id,
        first_name,
        last_name,
        email,
        phone_number
      ),
      facility:facility_id (
        id,
        name,
        contact_email,
        contact_phone
      )
    `)
    .order('created_at', { ascending: false });
  
  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
  }
  
  return <AdminTripsView trips={trips || []} />;
}