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
  } else {
    console.log(`🚀 TRIPS PAGE: Fetched ${trips?.length || 0} trips from database`);
    if (trips && trips.length > 0) {
      console.log('First trip sample:', {
        id: trips[0].id,
        user_id: trips[0].user_id,
        managed_client_id: trips[0].managed_client_id,
        facility_id: trips[0].facility_id,
        status: trips[0].status,
        created_at: trips[0].created_at
      });
    }
  }
  
  // Enhanced client information fetching - same logic as assign-trip page
  const tripsWithClients = trips || [];
  if (tripsWithClients.length > 0) {
    let supabaseAdmin = null;
    try {
      const adminModule = await import('@/lib/admin-supabase');
      supabaseAdmin = adminModule.supabaseAdmin;
      console.log(`🚀 ADMIN CLIENT: ${supabaseAdmin ? 'Available' : 'Not available'}`);
    } catch (adminError) {
      console.warn('Could not load admin client:', adminError);
    }
    
    console.log(`🚀 TRIPS PAGE: Processing ${tripsWithClients.length} trips for client data`);
    
    for (let trip of tripsWithClients) {
      console.log(`\n=== Processing trip ${trip.id} ===`);
      console.log('Trip fields:', {
        user_id: trip.user_id,
        managed_client_id: trip.managed_client_id,
        facility_id: trip.facility_id,
        status: trip.status
      });

      // Priority 1: Try user_id first since most trips have this
      if (trip.user_id) {
        try {
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email, phone_number, role')
            .eq('id', trip.user_id)
            .single();
          
          if (clientProfile) {
            console.log(`✅ SUCCESS: Found profile for user_id ${trip.user_id}:`, clientProfile);
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
              console.log(`✅ SUCCESS: Found facility managed client for trip ${trip.id}:`, facilityClient);
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
              console.log(`Found client profile:`, clientProfile);
              trip.managed_client = clientProfile;
            }
          } catch (clientError) {
            console.warn('Could not fetch client from profiles table');
          }
        }
      }
      
      // Fetch facility information if exists
      if (trip.facility_id) {
        try {
          console.log(`🔍 FETCHING FACILITY: trip ${trip.id} has facility_id ${trip.facility_id}`);
          
          // Try with admin client first since there might be RLS policies
          if (supabaseAdmin) {
            const { data: facilityData, error: facilityError } = await supabaseAdmin
              .from('facilities')
              .select('id, name, contact_email, contact_phone')
              .eq('id', trip.facility_id)
              .single();
            
            if (facilityError) {
              console.error(`❌ ADMIN FACILITY ERROR for trip ${trip.id}:`, facilityError);
            } else if (facilityData) {
              trip.facility = facilityData;
              console.log(`✅ SUCCESS: Found facility via admin client for trip ${trip.id}:`, facilityData);
            } else {
              console.log(`❌ NO DATA: No facility data found via admin client for trip ${trip.id}`);
            }
          } else {
            // Fallback to regular client
            const { data: facilityData, error: facilityError } = await supabase
              .from('facilities')
              .select('id, name, contact_email, contact_phone')
              .eq('id', trip.facility_id)
              .single();
            
            if (facilityError) {
              console.error(`❌ FACILITY ERROR for trip ${trip.id}:`, facilityError);
            } else if (facilityData) {
              trip.facility = facilityData;
              console.log(`✅ SUCCESS: Found facility for trip ${trip.id}:`, facilityData);
            } else {
              console.log(`❌ NO DATA: No facility data found for trip ${trip.id} with facility_id ${trip.facility_id}`);
            }
          }
        } catch (facilityError) {
          console.error(`❌ EXCEPTION: Could not fetch facility for trip ${trip.id}:`, facilityError);
        }
      } else {
        console.log(`ℹ️ Trip ${trip.id} has no facility_id`);
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
                console.log(`✅ Found auth email for trip ${trip.id}:`, authUser.email);
              }
            } catch (authError) {
              console.warn(`Could not fetch auth email for trip ${trip.id}`);
            }
          }
        }
      }
    }
  }
  
  // Final debug log
  console.log(`🚀 FINAL TRIPS DATA: Sending ${tripsWithClients.length} trips to AdminTripsView`);
  if (tripsWithClients.length > 0) {
    const sampleTrip = tripsWithClients.find(t => t.facility_id);
    if (sampleTrip) {
      console.log('Sample trip with facility_id:', {
        id: sampleTrip.id,
        facility_id: sampleTrip.facility_id,
        facility: sampleTrip.facility
      });
    }
  }
  
  return <AdminTripsView trips={tripsWithClients} />;
}