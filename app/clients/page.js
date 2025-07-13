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
        
        // Fetch all clients (users with role 'client')
        let allClients = [];
        
        try {
            const { data: clientProfiles, error: clientsError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    facilities (
                        id,
                        name,
                        address,
                        phone_number
                    )
                `)
                .eq('role', 'client')
                .order('created_at', { ascending: false });
            
            if (clientsError) {
                console.error('Error fetching clients:', clientsError);
            } else {
                allClients = clientProfiles || [];
            }
        } catch (fetchError) {
            console.error('Exception in client profiles fetching:', fetchError);
            allClients = [];
        }

        // Fetch all facilities for the filter dropdown
        const { data: facilities } = await supabase
            .from('facilities')
            .select('id, name')
            .order('name');

        // Get managed clients from facility app
        const { data: managedClients } = await supabase
            .from('facility_managed_clients')
            .select(`
                *,
                facilities!facility_id (
                    id,
                    name,
                    address,
                    phone_number
                )
            `)
            .order('created_at', { ascending: false });

        // Combine both types of clients
        const individualClients = allClients.filter(client => !client.facility_id);
        const facilityClients = allClients.filter(client => client.facility_id);

        // Add managed clients to the list (these are non-authenticated clients)
        const allManagedClients = (managedClients || []).map(client => ({
            ...client,
            client_type: 'managed',
            full_name: `${client.first_name || ''} ${client.last_name || ''}`.trim()
        }));
        
        // For each client, get their trips count
        const clientsWithStats = await Promise.all(allClients.map(async (client) => {
            const { count: tripCount } = await supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', client.id);

            const { data: lastTrip } = await supabase
                .from('trips')
                .select('*')
                .eq('user_id', client.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return {
                ...client,
                client_type: 'authenticated',
                trip_count: tripCount || 0,
                last_trip: lastTrip,
                full_name: `${client.first_name || ''} ${client.last_name || ''}`.trim()
            };
        }));

        // Get email addresses from auth.users for authenticated clients
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
            for (let client of clientsWithStats) {
                if (!client.email && client.id) {
                    try {
                        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(client.id);
                        if (authUser?.email) {
                            client.email = authUser.email;
                        }
                    } catch (error) {
                        console.error('Error fetching email for client:', client.id);
                    }
                }
            }
        }

        // Organize data for the view
        const organizedData = {
            individualClients: clientsWithStats.filter(c => !c.facility_id),
            facilityClients: clientsWithStats.filter(c => c.facility_id),
            managedClients: allManagedClients,
            facilities: facilities || [],
            totalClients: clientsWithStats.length + allManagedClients.length
        };
        
        return <AdminClientsView 
            user={user} 
            userProfile={profile} 
            data={organizedData}
        />;
    } catch (error) {
        console.error('Error in admin clients page:', error);
        redirect('/login?error=server_error');
    }
}