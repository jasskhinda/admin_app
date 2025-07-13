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
                
                // Show all trips, not just unassigned ones
                availableTrips = allTrips;
                console.log(`Showing ${availableTrips.length} total trips`);
                
                // Log trip statuses for debugging
                const statusCounts = allTrips.reduce((acc, trip) => {
                    acc[trip.status] = (acc[trip.status] || 0) + 1;
                    return acc;
                }, {});
                console.log('Trip status breakdown:', statusCounts);

                // Enhanced client information fetching
                for (let trip of availableTrips) {
                    console.log(`\n=== Processing trip ${trip.id} ===`);
                    console.log('Trip fields:', {
                        user_id: trip.user_id,
                        client_id: trip.client_id,
                        client_email: trip.client_email,
                        client_name: trip.client_name,
                        passenger_name: trip.passenger_name,
                        passenger_email: trip.passenger_email,
                        contact_name: trip.contact_name,
                        contact_email: trip.contact_email,
                        facility_id: trip.facility_id,
                        status: trip.status
                    });

                    // Try to get client information from multiple sources
                    if (trip.user_id) {
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
                    
                    // Try client_id if user_id didn't work
                    if (!trip.profiles && trip.client_id) {
                        try {
                            const { data: clientProfile } = await supabase
                                .from('profiles')
                                .select('id, first_name, last_name, full_name, email, phone_number, role')
                                .eq('id', trip.client_id)
                                .single();
                            
                            if (clientProfile) {
                                console.log(`Found profile for client_id ${trip.client_id}:`, clientProfile);
                                trip.profiles = clientProfile;
                            }
                        } catch (clientError) {
                            console.warn(`Could not fetch client by client_id for trip ${trip.id}:`, clientError.message);
                        }
                    }
                    
                    // Try email lookup if still no profile
                    if (!trip.profiles && trip.client_email) {
                        try {
                            const { data: clientProfile } = await supabase
                                .from('profiles')
                                .select('id, first_name, last_name, full_name, email, phone_number, role')
                                .eq('email', trip.client_email)
                                .single();
                            
                            if (clientProfile) {
                                console.log(`Found profile for email ${trip.client_email}:`, clientProfile);
                                trip.profiles = clientProfile;
                            }
                        } catch (clientError) {
                            console.warn(`Could not fetch client by email for trip ${trip.id}:`, clientError.message);
                        }
                    }
                    
                    // For facility trips, try multiple approaches to find client data
                    if (!trip.profiles && trip.facility_id) {
                        try {
                            // Method 1: Try to find by direct client_id reference in facility_clients
                            if (trip.client_id || trip.user_id) {
                                const clientIdToUse = trip.client_id || trip.user_id;
                                const { data: facilityClient } = await supabase
                                    .from('facility_clients')
                                    .select(`
                                        id,
                                        client_id,
                                        profiles:client_id (
                                            id, first_name, last_name, full_name, email, phone_number, role
                                        )
                                    `)
                                    .eq('facility_id', trip.facility_id)
                                    .eq('client_id', clientIdToUse)
                                    .single();
                                
                                if (facilityClient?.profiles) {
                                    console.log(`Found facility client by ID for trip ${trip.id}:`, facilityClient.profiles);
                                    trip.profiles = facilityClient.profiles;
                                }
                            }
                            
                            // Method 2: If no direct ID match, try to find all facility clients and match by name/email
                            if (!trip.profiles) {
                                const { data: facilityClients } = await supabase
                                    .from('facility_clients')
                                    .select(`
                                        id,
                                        client_id,
                                        profiles:client_id (
                                            id, first_name, last_name, full_name, email, phone_number, role
                                        )
                                    `)
                                    .eq('facility_id', trip.facility_id);
                                
                                if (facilityClients && facilityClients.length > 0) {
                                    console.log(`Found ${facilityClients.length} facility clients for facility ${trip.facility_id}`);
                                    
                                    let matchingClient = null;
                                    
                                    // Try to match by email first (most reliable)
                                    if (trip.client_email || trip.passenger_email) {
                                        const emailToMatch = trip.client_email || trip.passenger_email;
                                        matchingClient = facilityClients.find(fc => 
                                            fc.profiles?.email === emailToMatch
                                        );
                                        console.log(`Email match attempt for ${emailToMatch}:`, matchingClient ? 'Found' : 'Not found');
                                    }
                                    
                                    // Try to match by full name
                                    if (!matchingClient && (trip.client_name || trip.passenger_name)) {
                                        const nameToMatch = trip.client_name || trip.passenger_name;
                                        matchingClient = facilityClients.find(fc => {
                                            const profileFullName = fc.profiles?.full_name;
                                            const constructedName = `${fc.profiles?.first_name || ''} ${fc.profiles?.last_name || ''}`.trim();
                                            return profileFullName === nameToMatch || constructedName === nameToMatch;
                                        });
                                        console.log(`Name match attempt for "${nameToMatch}":`, matchingClient ? 'Found' : 'Not found');
                                    }
                                    
                                    // Try to match by first + last name fields
                                    if (!matchingClient && (trip.client_first_name || trip.passenger_first_name)) {
                                        const firstNameToMatch = trip.client_first_name || trip.passenger_first_name;
                                        const lastNameToMatch = trip.client_last_name || trip.passenger_last_name;
                                        
                                        matchingClient = facilityClients.find(fc => {
                                            return fc.profiles?.first_name === firstNameToMatch && 
                                                   (!lastNameToMatch || fc.profiles?.last_name === lastNameToMatch);
                                        });
                                        console.log(`First/Last name match attempt for "${firstNameToMatch} ${lastNameToMatch}":`, matchingClient ? 'Found' : 'Not found');
                                    }
                                    
                                    if (matchingClient?.profiles) {
                                        console.log(`Found matching facility client for trip ${trip.id}:`, matchingClient.profiles);
                                        trip.profiles = matchingClient.profiles;
                                    } else {
                                        console.log(`No matching facility client found for trip ${trip.id}. Available clients:`, 
                                            facilityClients.map(fc => ({
                                                email: fc.profiles?.email,
                                                name: fc.profiles?.full_name || `${fc.profiles?.first_name} ${fc.profiles?.last_name}`.trim()
                                            }))
                                        );
                                    }
                                }
                            }
                        } catch (facilityClientError) {
                            console.warn(`Could not fetch facility clients for trip ${trip.id}:`, facilityClientError.message);
                        }
                    }
                    
                    // If trip has facility_id, fetch facility information
                    if (trip.facility_id) {
                        try {
                            const { data: facilityData } = await supabase
                                .from('facilities')
                                .select('id, name, address, phone_number')
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
                    
                    // Get email from auth if still no email found
                    if (!trip.profiles?.email && trip.user_id && supabaseAdmin) {
                        try {
                            const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(trip.user_id);
                            if (authUser?.email) {
                                if (!trip.profiles) trip.profiles = {};
                                trip.profiles.email = authUser.email;
                                console.log(`Found auth email for trip ${trip.id}:`, authUser.email);
                            }
                        } catch (authError) {
                            console.warn(`Could not fetch auth email for trip ${trip.id}`);
                        }
                    }
                    
                    // Enhanced fallback: use trip fields directly if no profile found
                    if (!trip.profiles || (!trip.profiles.full_name && !trip.profiles.first_name && !trip.profiles.email)) {
                        console.log(`Using fallback data for trip ${trip.id}`);
                        
                        // Try to construct the best possible client information from available trip fields
                        const fullNameOptions = [
                            trip.client_name,
                            trip.passenger_name,
                            trip.contact_name,
                            trip.booking_contact_name,
                            (trip.client_first_name && trip.client_last_name) ? 
                                `${trip.client_first_name} ${trip.client_last_name}` : null,
                            (trip.passenger_first_name && trip.passenger_last_name) ? 
                                `${trip.passenger_first_name} ${trip.passenger_last_name}` : null,
                            (trip.contact_first_name && trip.contact_last_name) ? 
                                `${trip.contact_first_name} ${trip.contact_last_name}` : null
                        ].filter(Boolean);
                        
                        const emailOptions = [
                            trip.client_email,
                            trip.passenger_email,
                            trip.contact_email,
                            trip.booking_email,
                            trip.requester_email
                        ].filter(Boolean);
                        
                        const phoneOptions = [
                            trip.client_phone,
                            trip.passenger_phone,
                            trip.contact_phone,
                            trip.booking_phone,
                            trip.phone_number
                        ].filter(Boolean);
                        
                        const fallbackProfile = {
                            full_name: fullNameOptions[0] || null,
                            first_name: trip.client_first_name || trip.passenger_first_name || trip.contact_first_name ||
                                       (fullNameOptions[0] ? fullNameOptions[0].split(' ')[0] : null),
                            last_name: trip.client_last_name || trip.passenger_last_name || trip.contact_last_name ||
                                      (fullNameOptions[0] ? fullNameOptions[0].split(' ').slice(1).join(' ') : null),
                            email: emailOptions[0] || null,
                            phone_number: phoneOptions[0] || null
                        };
                        
                        // Only use fallback if we have some useful information
                        if (fallbackProfile.full_name || fallbackProfile.email || fallbackProfile.first_name) {
                            trip.profiles = { ...trip.profiles, ...fallbackProfile };
                            console.log(`Applied fallback profile for trip ${trip.id}:`, fallbackProfile);
                            console.log(`Available name options were:`, fullNameOptions);
                            console.log(`Available email options were:`, emailOptions);
                        } else {
                            console.log(`No usable client data found for trip ${trip.id}. Trip fields:`, {
                                client_name: trip.client_name,
                                passenger_name: trip.passenger_name,
                                client_email: trip.client_email,
                                passenger_email: trip.passenger_email,
                                user_id: trip.user_id,
                                client_id: trip.client_id,
                                facility_id: trip.facility_id
                            });
                        }
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