import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DriverDetailView from './DriverDetailView';

// Helper function to process client information for a trip
async function processClientInfo(trip, supabase, supabaseAdmin) {
    // Handle individual clients from BookingCCT app
    if (trip.user_id) {
        try {
            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, full_name, email, phone_number, role')
                .eq('id', trip.user_id)
                .single();
            
            if (clientProfile) {
                trip.profiles = {
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
            console.warn(`Could not fetch individual client for trip ${trip.id}:`, clientError.message);
        }
    }
    // Handle facility managed clients from facility_app
    else if (trip.managed_client_id) {
        try {
            const { data: managedClient } = await supabase
                .from('facility_managed_clients')
                .select('id, first_name, last_name, email, phone_number')
                .eq('id', trip.managed_client_id)
                .single();
            
            if (managedClient) {
                trip.profiles = {
                    id: managedClient.id,
                    first_name: managedClient.first_name,
                    last_name: managedClient.last_name,
                    full_name: `${managedClient.first_name || ''} ${managedClient.last_name || ''}`.trim(),
                    email: managedClient.email,
                    phone_number: managedClient.phone_number,
                    role: 'facility_client'
                };
            }
        } catch (clientError) {
            console.warn(`Could not fetch managed client for trip ${trip.id}:`, clientError.message);
        }
    }
    
    // Create fallback profile if needed
    if (!trip.profiles || !trip.profiles.full_name) {
        let fallbackName = trip.client_name || trip.passenger_name || 'Unknown Client';
        let fallbackEmail = trip.client_email || 'No email available';
        
        trip.profiles = {
            full_name: fallbackName,
            email: fallbackEmail,
            first_name: fallbackName.split(' ')[0],
            last_name: fallbackName.split(' ').slice(1).join(' ') || '',
            role: trip.facility_id ? 'facility_client' : 'client',
            ...(trip.profiles || {})
        };
    }
}

// This is a Server Component
export default async function DriverDetailPage({ params, searchParams }) {
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

        // Fetch all trips for this driver
        let allTrips = [];
        try {
            const { data: tripsData, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .eq('driver_id', driverId)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error('Error fetching trips:', tripsError);
            } else if (tripsData) {
                allTrips = tripsData;
                
                // Process each trip to get client information
                for (let trip of allTrips) {
                    await processClientInfo(trip, supabase, supabaseAdmin);
                }
            }
        } catch (error) {
            console.warn('Could not fetch trips:', error.message);
        }

        // Fetch trips assigned to this specific driver
        const { data: assignedTrips, error: assignedTripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', driverId)
            .in('status', ['in_progress', 'upcoming'])
            .order('created_at', { ascending: false });

        // Process assigned trips
        let processedAssignedTrips = [];
        if (assignedTrips && assignedTrips.length > 0) {
            for (let trip of assignedTrips) {
                await processClientInfo(trip, supabase, supabaseAdmin);
            }
            processedAssignedTrips = assignedTrips;
        }

        // Fetch trips awaiting driver acceptance for this specific driver
        const { data: waitingTrips, error: waitingTripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', driverId)
            .eq('status', 'awaiting_driver_acceptance')
            .order('created_at', { ascending: false });

        // Process waiting trips
        let processedWaitingTrips = [];
        if (waitingTrips && waitingTrips.length > 0) {
            for (let trip of waitingTrips) {
                await processClientInfo(trip, supabase, supabaseAdmin);
            }
            processedWaitingTrips = waitingTrips;
        }

        // Fetch trips rejected by this specific driver
        const { data: rejectedTrips, error: rejectedTripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('status', 'rejected')
            .eq('rejected_by_driver_id', driverId)
            .order('created_at', { ascending: false })
            .limit(10);

        // Process rejected trips
        let processedRejectedTrips = [];
        if (rejectedTrips && rejectedTrips.length > 0) {
            for (let trip of rejectedTrips) {
                await processClientInfo(trip, supabase, supabaseAdmin);
            }
            processedRejectedTrips = rejectedTrips;
        }

        // Fetch completed trips
        const { data: completedTrips, error: completedTripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', driverId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(20);

        // Process completed trips
        let processedCompletedTrips = [];
        if (completedTrips && completedTrips.length > 0) {
            for (let trip of completedTrips) {
                await processClientInfo(trip, supabase, supabaseAdmin);
            }
            processedCompletedTrips = completedTrips;
        }

        // Fetch all drivers for reference
        const { data: allDrivers } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email, status')
            .eq('role', 'driver')
            .order('first_name');

        // Get vehicle information (keep existing logic)
        let vehicle = null;
        try {
            const { data: vehicleData } = await supabase
                .from('vehicles')
                .select('*')
                .eq('driver_id', driverId)
                .single();
            vehicle = vehicleData;
        } catch (error) {
            console.warn('Could not fetch vehicle data:', error.message);
        }

        // Calculate trip statistics
        let tripStats = {
            total_trips: allTrips.length,
            completed_trips: allTrips.filter(trip => trip.status === 'completed').length,
            this_month_trips: 0,
            last_trip: allTrips.length > 0 ? allTrips[0] : null
        };

        // Calculate this month's trips
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        tripStats.this_month_trips = allTrips.filter(trip => 
            new Date(trip.created_at) >= startOfMonth
        ).length;

        return (
            <DriverDetailView 
                user={user}
                userProfile={profile}
                driver={driver}
                allTrips={allTrips}
                assignedTrips={processedAssignedTrips}
                waitingTrips={processedWaitingTrips}
                rejectedTrips={processedRejectedTrips}
                completedTrips={processedCompletedTrips}
                allDrivers={allDrivers || []}
                vehicle={vehicle}
                tripStats={tripStats}
            />
        );
    } catch (error) {
        console.error('Error in driver detail page:', error);
        redirect('/drivers?error=server_error');
    }
}