import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminClientsView from './AdminClientsView';

// This is a Server Component
export default async function AdminClientsPage() {
    console.log('Admin clients page server component executing');
    
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
        
        // Fetch clients (users with role 'client')
        let clients = [];
        
        // Try with the most reliable approach first
        try {
            const { data: clientProfiles, error: clientsError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'client')
                .order('created_at', { ascending: false });
            
            if (clientsError) {
                console.error('Error fetching clients:', clientsError);
            } else {
                clients = clientProfiles || [];
            }
        } catch (fetchError) {
            console.error('Exception in client profiles fetching:', fetchError);
            clients = [];
        }
        
        console.log(`Successfully fetched ${clients.length} clients`);

        // For each client, get their trips
        const clientsWithTrips = await Promise.all((clients || []).map(async (client) => {
            const { data: trips, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .eq('user_id', client.id)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error(`Error fetching trips for client ${client.id}:`, tripsError);
                return {
                    ...client,
                    trips: [],
                    trip_count: 0,
                    last_trip: null,
                    recent_status: null
                };
            }

            const tripCount = trips?.length || 0;
            const lastTrip = trips && trips.length > 0 ? trips[0] : null;

            return {
                ...client,
                trips: trips || [],
                trip_count: tripCount,
                last_trip: lastTrip,
                recent_status: lastTrip?.status || null
            };
        }));
        
        return <AdminClientsView user={user} userProfile={profile} clients={clientsWithTrips} />;
    } catch (error) {
        console.error('Error in admin clients page:', error);
        redirect('/login?error=server_error');
    }
}