import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminDispatchersView from './AdminDispatchersView';

// This is a Server Component
export default async function AdminDispatchersPage() {
    console.log('Admin dispatchers page server component executing');
    
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
        
        // Fetch dispatchers (users with role 'dispatcher')
        let dispatchers = [];
        
        try {
            const { data: dispatcherProfiles, error: dispatchersError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'dispatcher')
                .order('created_at', { ascending: false });
            
            if (dispatchersError) {
                console.error('Error fetching dispatchers:', dispatchersError);
            } else {
                dispatchers = dispatcherProfiles || [];
            }
        } catch (fetchError) {
            console.error('Exception in dispatcher profiles fetching:', fetchError);
            dispatchers = [];
        }
        
        console.log(`Successfully fetched ${dispatchers.length} dispatchers`);

        // For each dispatcher, get their assigned trips and clients
        const dispatchersWithStats = await Promise.all((dispatchers || []).map(async (dispatcher) => {
            // This statistic would require a join between trips and profiles
            // For simplicity, just fetch all trips assigned to this dispatcher
            const { data: trips = [], error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .eq('dispatcher_id', dispatcher.id)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error(`Error fetching trips for dispatcher ${dispatcher.id}:`, tripsError);
            }

            // Get unique client IDs from trips
            const clientIds = trips ? [...new Set(trips.map(trip => trip.user_id))] : [];
            
            return {
                ...dispatcher,
                trips: trips || [],
                trip_count: trips ? trips.length : 0,
                client_count: clientIds.length,
                active_trips: trips ? trips.filter(t => ['pending', 'upcoming', 'in_progress'].includes(t.status)).length : 0,
                completed_trips: trips ? trips.filter(t => t.status === 'completed').length : 0
            };
        }));
        
        return <AdminDispatchersView user={user} userProfile={profile} dispatchers={dispatchersWithStats} />;
    } catch (error) {
        console.error('Error in admin dispatchers page:', error);
        redirect('/login?error=server_error');
    }
}