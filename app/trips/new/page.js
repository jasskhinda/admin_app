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

        if (profileError || !profile || !['admin', 'dispatcher', 'facility'].includes(profile.role)) {
            redirect('/login?error=Access%20denied.%20Insufficient%20privileges.');
        }

        // Fetch clients for trip creation
        const { data: clients, error: clientsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'client')
            .order('created_at', { ascending: false });

        if (clientsError) {
            console.error('Error fetching clients:', clientsError);
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
        const { NewTripForm } = require('../../components/NewTripForm');
        
        return <NewTripForm 
            user={user} 
            userProfile={profile} 
            clients={clients || []} 
            drivers={drivers || []}
            preselectedDriverId={preselectedDriverId}
        />;
    } catch (error) {
        console.error('Error in new trip page:', error);
        redirect('/login?error=server_error');
    }
}