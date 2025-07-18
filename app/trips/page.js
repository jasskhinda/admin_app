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
  
  // Fetch trips with basic data first, then enrich with related data
  const { data: rawTrips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
  }
  
  // Enrich trips with related data
  const trips = rawTrips ? await Promise.all(
    rawTrips.map(async (trip) => {
      const enrichedTrip = { ...trip };
      
      // Get user profile if user_id exists
      if (trip.user_id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, email, phone_number, role')
          .eq('id', trip.user_id)
          .single();
        if (userProfile) enrichedTrip.user_profile = userProfile;
      }
      
      // Get managed client if managed_client_id exists
      if (trip.managed_client_id) {
        const { data: managedClient } = await supabase
          .from('facility_managed_clients')
          .select('id, first_name, last_name, email, phone_number')
          .eq('id', trip.managed_client_id)
          .single();
        if (managedClient) enrichedTrip.managed_client = managedClient;
      }
      
      // Get facility if facility_id exists
      if (trip.facility_id) {
        const { data: facility } = await supabase
          .from('facilities')
          .select('id, name, contact_email, phone_number')
          .eq('id', trip.facility_id)
          .single();
        if (facility) enrichedTrip.facility = facility;
      }
      
      // Get driver if driver_id exists
      if (trip.driver_id) {
        const { data: driver } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone_number, vehicle_model, vehicle_license')
          .eq('id', trip.driver_id)
          .single();
        if (driver) enrichedTrip.driver = driver;
      }
      
      return enrichedTrip;
    })
  ) : [];
  
  console.log('Enriched trips:', { trips: trips?.length || 0, error: tripsError });
  
  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
  }
  
  return <AdminTripsView trips={trips} />;
}