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
  
  if (profileError || !profile || !['admin', 'dispatcher'].includes(profile.role)) {
    redirect('/login?error=Admin%20or%20dispatcher%20access%20required');
  }
  
  // Fetch all trips - use simple query first, then enrich with client data
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
  }
  
  // Enhanced client information fetching - same logic as assign-trip page
  const tripsWithClients = trips || [];
  if (tripsWithClients.length > 0) {
    let supabaseAdmin = null;
    try {
      const adminModule = await import('@/lib/admin-supabase');
      supabaseAdmin = adminModule.supabaseAdmin;
    } catch (adminError) {
      console.warn('Could not load admin client:', adminError);
    }
    
    // Collect all unique facility IDs
    const facilityIds = [...new Set(tripsWithClients
      .filter(trip => trip.facility_id)
      .map(trip => trip.facility_id))];
    
    // Batch fetch all facilities
    const facilityMap = {};
    if (facilityIds.length > 0) {
      const { data: facilities, error: facilitiesError } = await supabase
        .from('facilities')
        .select('id, name, contact_email, phone_number')
        .in('id', facilityIds);
      
      if (facilitiesError) {
        console.error('Error fetching facilities:', facilitiesError);
        // Try with admin client if available
        if (supabaseAdmin) {
          const { data: adminFacilities, error: adminError } = await supabaseAdmin
            .from('facilities')
            .select('id, name, contact_email, phone_number')
            .in('id', facilityIds);
          
          if (!adminError && adminFacilities) {
            adminFacilities.forEach(facility => {
              facilityMap[facility.id] = facility;
            });
          }
        }
      } else if (facilities) {
        facilities.forEach(facility => {
          facilityMap[facility.id] = facility;
        });
      }
    }
    
    for (let trip of tripsWithClients) {

      // Priority 1: Try user_id first since most trips have this
      if (trip.user_id) {
        try {
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email, phone_number, role')
            .eq('id', trip.user_id)
            .single();
          
          if (clientProfile) {
            trip.user_profile = {
              id: clientProfile.id,
              first_name: clientProfile.first_name,
              last_name: clientProfile.last_name,
              full_name: clientProfile.full_name || `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim(),
              email: clientProfile.email,
              phone_number: clientProfile.phone_number,
              role: clientProfile.role
            };
          }
        } catch (clientError) {
          console.warn(`Could not fetch client for user_id ${trip.user_id}:`, clientError.message);
        }
      }
      
      // Priority 2: If user_id didn't work and we have managed_client_id, try that
      if (!trip.user_profile && trip.managed_client_id) {
        // For facility trips, try facility_managed_clients table first
        if (trip.facility_id) {
          try {
            const { data: facilityClient } = await supabase
              .from('facility_managed_clients')
              .select('id, first_name, last_name, email, phone_number')
              .eq('id', trip.managed_client_id)
              .single();
            
            if (facilityClient) {
              trip.managed_client = facilityClient;
            }
          } catch (facilityClientError) {
            console.warn('Could not fetch facility managed client, trying profiles table');
          }
        }
        
        // If not found in facility_managed_clients, try profiles table
        if (!trip.managed_client) {
          try {
            const { data: clientProfile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, full_name, email, phone_number, role')
              .eq('id', trip.managed_client_id)
              .single();
            
            if (clientProfile) {
              trip.managed_client = clientProfile;
            }
          } catch (clientError) {
            console.warn('Could not fetch client from profiles table');
          }
        }
      }
      
      // Attach facility information from pre-fetched map
      if (trip.facility_id && facilityMap[trip.facility_id]) {
        trip.facility = facilityMap[trip.facility_id];
      }
      
      // Get email from auth if still no email found in profile
      if ((trip.user_profile && !trip.user_profile.email) || (trip.managed_client && !trip.managed_client.email)) {
        if (supabaseAdmin) {
          const idToTry = trip.user_id || trip.managed_client_id;
          if (idToTry) {
            try {
              const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(idToTry);
              if (authUser?.email) {
                if (trip.user_profile) {
                  trip.user_profile.email = authUser.email;
                } else if (trip.managed_client) {
                  trip.managed_client.email = authUser.email;
                }
              }
            } catch (authError) {
              console.warn(`Could not fetch auth email for trip ${trip.id}`);
            }
          }
        }
      }
    }
  }
  
  
  return <AdminTripsView trips={tripsWithClients} />;
}