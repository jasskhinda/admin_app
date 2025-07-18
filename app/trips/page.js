import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminTripsView from './AdminTripsView';
import { Suspense } from 'react';

// Loading component
function TripsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  
  // Fetch trips with all related data using left joins
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select(`
      *,
      user_profile:profiles!trips_user_id_fkey(
        id, first_name, last_name, full_name, email, phone_number, role
      ),
      managed_client:facility_managed_clients!trips_managed_client_id_fkey(
        id, first_name, last_name, email, phone_number
      ),
      facility:facilities!trips_facility_id_fkey(
        id, name, contact_email, phone_number
      ),
      driver:profiles!trips_driver_id_fkey(
        id, first_name, last_name, phone_number, vehicle_model, vehicle_license
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);
  
  console.log('Trips query result:', { trips: trips?.length || 0, error: tripsError });
  
  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
  }
  
  const tripsWithClients = trips || [];
  return <AdminTripsView trips={tripsWithClients} />;
}