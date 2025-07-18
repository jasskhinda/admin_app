import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

// This is a Server Component
export default async function NewTripPage({ searchParams }) {
    console.log('New Trip page server component executing');
    
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

        // Get user profile and verify it has appropriate role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            redirect('/login?error=Access%20denied.%20Admin%20access%20required.');
        }

        // Fetch individual clients
        const { data: individualClients, error: clientsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'client')
            .order('created_at', { ascending: false });

        if (clientsError) {
            console.error('Error fetching clients:', clientsError);
        }
        
        // Fetch managed clients from facility_managed_clients
        const { data: managedClients, error: managedClientsError } = await supabase
            .from('facility_managed_clients')
            .select(`
                *,
                facility:facilities!facility_managed_clients_facility_id_fkey(
                    id,
                    name,
                    contact_email,
                    phone_number
                )
            `)
            .order('created_at', { ascending: false });
            
        if (managedClientsError) {
            console.error('Error fetching managed clients:', managedClientsError);
        }
        
        // Fetch facilities
        const { data: facilities, error: facilitiesError } = await supabase
            .from('facilities')
            .select('*')
            .order('name', { ascending: true });
            
        if (facilitiesError) {
            console.error('Error fetching facilities:', facilitiesError);
        }

        // Get drivers for assignment
        const { data: drivers } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'driver')
            .order('created_at', { ascending: false });

        // Get the pre-selected driver from search params if any
        const preselectedDriverId = searchParams?.driver;
        
        // Import the NewTripForm component
        const { default: NewTripForm } = await import('./NewTripForm');
        
        return <NewTripForm 
            user={user} 
            userProfile={profile} 
            individualClients={individualClients || []} 
            managedClients={managedClients || []}
            facilities={facilities || []}
            drivers={drivers || []}
            preselectedDriverId={preselectedDriverId}
        />;
    } catch (error) {
        console.error('Error in new trip page:', error);
        redirect('/login?error=server_error');
    }
}