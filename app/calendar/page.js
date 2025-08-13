import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { CalendarView } from '../components/CalendarView';

export default async function CalendarPage() {
  const supabase = await createClient();
  
  try {
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Calendar auth error:', userError);
      redirect('/login?error=Authentication%20error');
    }
    
    // Get user profile to verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      redirect('/login?error=Profile%20error');
    }
    
    if (!profile || profile.role !== 'admin') {
      console.log('Not an admin in calendar check');
      redirect('/login?error=Admin%20access%20required');
    }
    
    console.log('Admin authenticated in calendar, profile ID:', profile.id);

    // Fetch trips for calendar
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .order('pickup_time', { ascending: true });

    if (tripsError) {
      console.error('Error fetching trips for calendar:', tripsError);
    }
    
    // Get all user IDs from trips to fetch their profiles
    const userIds = (trips || []).map(trip => trip.user_id).filter(Boolean);
    
    // If we have user IDs, fetch their profiles
    let userProfiles = {};
    if (userIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        // Create lookup object by ID
        userProfiles = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      } catch (error) {
        console.error('Error fetching user profiles:', error);
      }
    }
    
    // Process trips with user profiles
    const processedTrips = (trips || []).map(trip => {
      let clientName = trip.client_name;
      
      // Try to get name from user profiles
      if (!clientName && trip.user_id && userProfiles[trip.user_id]) {
        const profile = userProfiles[trip.user_id];
        if (profile.first_name || profile.last_name) {
          clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        }
      }
      
      // Fall back to other methods if we still don't have a name
      if (!clientName) {
        clientName = trip.user_id ? `Client ${trip.user_id.substring(0, 4)}` : 'Unknown Client';
      }
          
      return {
        ...trip,
        client_name: clientName
      };
    });

    return <CalendarView user={user} userProfile={profile} trips={processedTrips} />;
    
  } catch (error) {
    console.error('Unexpected calendar error:', error);
    redirect('/login?error=Unexpected%20error');
  }
}