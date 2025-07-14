import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import AssignTripView from './AssignTripView';

// This is a Server Component
export default async function AssignTripPage({ params }) {
    const { id: driverId } = params;
    
    try {
        // Create server client
        const supabase = await createClient();
        
        // Check user - always use getUser for security
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // Redirect to login if there's no user
        if (userError || !user) {
            console.error('Auth error:', userError);
            redirect('/login');
        }

        // Get user profile and verify it has admin role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || !['admin', 'dispatcher'].includes(profile.role)) {
            redirect('/login?error=Access%20denied.%20Admin%20or%20dispatcher%20privileges%20required.');
        }
        
        // Fetch driver details
        const { data: driver, error: driverError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', driverId)
            .eq('role', 'driver')
            .single();
            
        if (driverError || !driver) {
            redirect('/drivers?error=Driver%20not%20found');
        }

        // Get email from auth if not in profile
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin && !driver.email) {
            try {
                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(driverId);
                if (authUser?.email) {
                    driver.email = authUser.email;
                }
            } catch (error) {
                console.error('Error fetching email for driver:', driverId);
            }
        }

        // Fetch all trips (not just available ones) to show different statuses
        let availableTrips = [];
        let allTrips = [];
        let tripsFetchError = null;
        
        try {
            // First, try to get all trips without joins to see if table exists
            const { data: allTripsData, error: allTripsError } = await supabase
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (allTripsError) {
                console.error('Error fetching all trips:', allTripsError);
                tripsFetchError = allTripsError;
            } else if (allTripsData) {
                allTrips = allTripsData;
                console.log(`Found ${allTrips.length} total trips in database`);
                
                // Show all trips (not just assignable ones) so admin can see pending/cancelled too
                availableTrips = allTrips;
                console.log(`Showing ${availableTrips.length} total trips for assignment view`);
                
                // Log trip statuses for debugging
                const statusCounts = allTrips.reduce((acc, trip) => {
                    acc[trip.status] = (acc[trip.status] || 0) + 1;
                    return acc;
                }, {});
                console.log('Trip status breakdown:', statusCounts);
                
                // Log which trips were filtered out
                const filteredOutTrips = allTrips.filter(trip => 
                    !assignableStatuses.includes(trip.status) || trip.driver_id
                );
                console.log(`Filtered out ${filteredOutTrips.length} trips:`);
                filteredOutTrips.forEach(trip => {
                    console.log(`- Trip ${trip.id}: status=${trip.status}, driver_id=${trip.driver_id}`);
                });

                // Enhanced client information fetching
                for (let trip of availableTrips) {
                    console.log(`\n=== Processing trip ${trip.id} ===`);
                    console.log('Trip fields:', {
                        user_id: trip.user_id,
                        managed_client_id: trip.managed_client_id,
                        facility_id: trip.facility_id,
                        status: trip.status,
                        bill_to: trip.bill_to
                    });

                    // Method 1: Try managed_client_id (for facility trips)
                    if (trip.managed_client_id) {
                        try {
                            const { data: clientProfile } = await supabase
                                .from('profiles')
                                .select('id, first_name, last_name, full_name, email, phone_number, role')
                                .eq('id', trip.managed_client_id)
                                .single();
                            
                            if (clientProfile) {
                                console.log(`Found profile for managed_client_id ${trip.managed_client_id}:`, clientProfile);
                                trip.profiles = clientProfile;
                            }
                        } catch (clientError) {
                            console.warn(`Could not fetch client for managed_client_id ${trip.managed_client_id}:`, clientError.message);
                        }
                    }

                    // Method 2: Try user_id (for individual bookings)
                    if (!trip.profiles && trip.user_id) {
                        try {
                            const { data: clientProfile } = await supabase
                                .from('profiles')
                                .select('id, first_name, last_name, full_name, email, phone_number, role')
                                .eq('id', trip.user_id)
                                .single();
                            
                            if (clientProfile) {
                                console.log(`Found profile for user_id ${trip.user_id}:`, clientProfile);
                                trip.profiles = clientProfile;
                            }
                        } catch (clientError) {
                            console.warn(`Could not fetch client for trip ${trip.id}:`, clientError.message);
                        }
                    }
                    
                    // Method 3: For facility trips, fetch client directly from facility_managed_clients table
                    if (!trip.profiles && trip.facility_id && trip.managed_client_id) {
                        try {
                            const { data: facilityClient } = await supabase
                                .from('facility_managed_clients')
                                .select('id, first_name, last_name, email, phone_number')
                                .eq('id', trip.managed_client_id)
                                .single();
                            
                            if (facilityClient) {
                                console.log(`Found facility managed client for trip ${trip.id}:`, facilityClient);
                                // Convert facility client data to profiles format
                                trip.profiles = {
                                    id: facilityClient.id,
                                    first_name: facilityClient.first_name,
                                    last_name: facilityClient.last_name,
                                    full_name: `${facilityClient.first_name} ${facilityClient.last_name}`,
                                    email: facilityClient.email,
                                    phone_number: facilityClient.phone_number,
                                    role: 'facility_client'
                                };
                            }
                        } catch (facilityClientError) {
                            console.warn(`Could not fetch facility managed client for trip ${trip.id}:`, facilityClientError.message);
                        }
                    }
                    
                    // If trip has facility_id, fetch facility information
                    if (trip.facility_id) {
                        try {
                            const { data: facilityData } = await supabase
                                .from('facilities')
                                .select('id, name, address, phone_number, contact_email')
                                .eq('id', trip.facility_id)
                                .single();
                            
                            if (facilityData) {
                                trip.facility = facilityData;
                                console.log(`Found facility for trip ${trip.id}:`, facilityData.name);
                            }
                        } catch (facilityError) {
                            console.warn(`Could not fetch facility for trip ${trip.id}:`, facilityError.message);
                        }
                    }
                    
                    // Get email from auth if still no email found (try both managed_client_id and user_id)
                    if (!trip.profiles?.email && supabaseAdmin) {
                        const idToTry = trip.managed_client_id || trip.user_id;
                        if (idToTry) {
                            try {
                                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(idToTry);
                                if (authUser?.email) {
                                    if (!trip.profiles) trip.profiles = {};
                                    trip.profiles.email = authUser.email;
                                    console.log(`Found auth email for trip ${trip.id} using ${trip.managed_client_id ? 'managed_client_id' : 'user_id'}:`, authUser.email);
                                }
                            } catch (authError) {
                                console.warn(`Could not fetch auth email for trip ${trip.id}`);
                            }
                        }
                    }
                    
                    // ALWAYS create a fallback profile for display purposes
                    if (!trip.profiles || !trip.profiles.full_name) {
                        console.log(`Creating fallback profile for trip ${trip.id}`);
                        
                        // For facility trips, create a generic client name if we can't find the actual client
                        let fallbackName = 'Unknown Client';
                        let fallbackEmail = 'No email available';
                        
                        if (trip.facility_id && trip.managed_client_id) {
                            // For facility trips, show a more descriptive name
                            fallbackName = `Facility Client (ID: ${trip.managed_client_id.substring(0, 8)}...)`;
                            fallbackEmail = 'Contact facility for client details';
                        } else if (trip.user_id) {
                            // For individual bookings
                            fallbackName = `Individual Client (ID: ${trip.user_id.substring(0, 8)}...)`;
                        }
                        
                        const fallbackProfile = {
                            full_name: fallbackName,
                            email: fallbackEmail,
                            first_name: fallbackName.split(' ')[0],
                            last_name: fallbackName.split(' ').slice(1).join(' ') || '',
                            role: trip.facility_id ? 'facility_client' : 'client'
                        };
                        
                        // Merge with any existing profile data
                        trip.profiles = {
                            ...fallbackProfile,
                            ...(trip.profiles || {})
                        };
                        
                        console.log(`Applied fallback profile for trip ${trip.id}:`, trip.profiles);
                    } else {
                        console.log(`Trip ${trip.id} already has complete profile:`, trip.profiles);
                    }
                    
                    console.log(`Final profile for trip ${trip.id}:`, trip.profiles);
                }
            }
        } catch (error) {
            console.warn('Could not fetch trips:', error.message);
            tripsFetchError = error;
        }

        // Fetch all drivers for reference
        const { data: allDrivers } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email, status')
            .eq('role', 'driver')
            .order('first_name');

        // Get emails for drivers
        if (supabaseAdmin && allDrivers) {
            for (let driver of allDrivers) {
                if (!driver.email && driver.id) {
                    try {
                        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(driver.id);
                        if (authUser?.email) {
                            driver.email = authUser.email;
                        }
                    } catch (error) {
                        console.error('Error fetching email for driver:', driver.id);
                    }
                }
            }
        }
        
        console.log(`Processed ${availableTrips.length} trips. Sample trip data:`);
        if (availableTrips.length > 0) {
            console.log('First trip:', {
                id: availableTrips[0].id,
                facility_id: availableTrips[0].facility_id,
                client_name: availableTrips[0].client_name,
                passenger_name: availableTrips[0].passenger_name,
                profiles: availableTrips[0].profiles,
                facility: availableTrips[0].facility
            });
        }

        return (
            <AssignTripView 
                user={user}
                userProfile={profile}
                driver={driver}
                availableTrips={availableTrips}
                allTrips={allTrips}
                allDrivers={allDrivers || []}
                tripsFetchError={tripsFetchError}
            />
        );
    } catch (error) {
        console.error('Error in assign trip page:', error);
        redirect('/drivers?error=server_error');
    }
}