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
                    // Try to get client information from multiple sources
                    if (trip.user_id) {
                        try {
                            const { data: clientProfile } = await supabase
                                .from('profiles')
                                .select('id, first_name, last_name, full_name, email, phone_number, role')
                                .eq('id', trip.user_id)
                                .single();
                            
                            if (clientProfile) {
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
                                trip.profiles = clientProfile;
                            }
                        } catch (clientError) {
                            console.warn(`Could not fetch client by email for trip ${trip.id}:`, clientError.message);
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
                            }
                        } catch (authError) {
                            console.warn(`Could not fetch auth email for trip ${trip.id}`);
                        }
                    }
                    
                    // Fallback: use trip fields directly if no profile found
                    if (!trip.profiles) {
                        trip.profiles = {
                            full_name: trip.client_name || trip.passenger_name || null,
                            first_name: trip.client_first_name || trip.passenger_first_name || null,
                            last_name: trip.client_last_name || trip.passenger_last_name || null,
                            email: trip.client_email || trip.passenger_email || null,
                            phone_number: trip.client_phone || trip.passenger_phone || null
                        };
                    }
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