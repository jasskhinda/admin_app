import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminDriversView from './AdminDriversView';

// This is a Server Component
export default async function AdminDriversPage() {
    console.log('Admin drivers page server component executing');
    
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

        if (profileError || !profile || profile.role !== 'admin') {
            redirect('/login?error=Access%20denied.%20Admin%20privileges%20required.');
        }
        
        // Fetch drivers (users with role 'driver')
        let drivers = [];
        
        try {
            const { data: driverProfiles, error: driversError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'driver')
                .order('created_at', { ascending: false });
            
            if (driversError) {
                console.error('Error fetching drivers:', driversError);
            } else {
                drivers = driverProfiles || [];
            }
        } catch (fetchError) {
            console.error('Exception in driver profiles fetching:', fetchError);
            drivers = [];
        }
        
        console.log(`Successfully fetched ${drivers.length} drivers`);

        // For each driver, get their trips
        const driversWithTrips = await Promise.all((drivers || []).map(async (driver) => {
            // Get trips assigned to this driver
            let trips = [];
            let tripCount = 0;
            let completedTrips = 0;
            let lastTrip = null;
            
            try {
                const { data: tripsData, error: tripsError } = await supabase
                    .from('trips')
                    .select('*')
                    .eq('driver_id', driver.id)
                    .order('created_at', { ascending: false });

                if (tripsError && tripsError.code !== '42P01') {
                    console.error(`Error fetching trips for driver ${driver.id}:`, tripsError);
                } else if (tripsData) {
                    trips = tripsData;
                    tripCount = trips.length;
                    completedTrips = trips.filter(trip => trip.status === 'completed').length;
                    lastTrip = trips.length > 0 ? trips[0] : null;
                }
            } catch (error) {
                console.warn(`Could not fetch trips for driver ${driver.id}:`, error.message);
            }

            // Try to fetch vehicle information
            let vehicle = null;
            try {
                const { data: vehicleData, error: vehicleError } = await supabase
                    .from('vehicles')
                    .select('*')
                    .eq('driver_id', driver.id)
                    .single();
                
                if (!vehicleError) {
                    vehicle = vehicleData;
                }
            } catch (vehicleError) {
                console.warn(`Could not fetch vehicle for driver ${driver.id}:`, vehicleError.message);
            }

            return {
                ...driver,
                trips: trips || [],
                trip_count: tripCount,
                completed_trips: completedTrips,
                last_trip: lastTrip,
                vehicle
            };
        }));

        // Get email addresses from auth.users for drivers
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
            for (let driver of driversWithTrips) {
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
        
        return <AdminDriversView user={user} userProfile={profile} drivers={driversWithTrips} />;
    } catch (error) {
        console.error('Error in admin drivers page:', error);
        redirect('/login?error=server_error');
    }
}