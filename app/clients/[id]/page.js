import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ClientDetailView from './ClientDetailView';

export default async function ClientDetailPage({ params }) {
  const supabase = await createClient();
  const clientId = params.id;
  
  // Get the user - always use getUser for security
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }
  
  // Get user profile to verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login');
  }

  // Get client profile with facility information
  const { data: client, error: clientError } = await supabase
    .from('profiles')
    .select(`
      *,
      facilities (
        id,
        name,
        address,
        phone_number,
        contact_email
      )
    `)
    .eq('id', clientId)
    .eq('role', 'client')
    .single();
  
  if (clientError || !client) {
    redirect('/clients');
  }

  // Get email from auth.users if not in profile
  if (!client.email) {
    try {
      // Import admin client
      const { supabaseAdmin } = await import('@/lib/admin-supabase');
      if (supabaseAdmin) {
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(clientId);
        if (authUser?.email) {
          client.email = authUser.email;
        }
      }
    } catch (error) {
      console.error('Error fetching email:', error);
    }
  }

  // Get trip statistics
  const { count: totalTrips } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', clientId);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { count: monthTrips } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', clientId)
    .gte('created_at', `${currentMonth}-01`);

  // Get recent trips
  const { data: recentTrips } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  return (
    <ClientDetailView 
      client={client}
      stats={{
        totalTrips: totalTrips || 0,
        monthTrips: monthTrips || 0,
        recentTrips: recentTrips || []
      }}
    />
  );
}