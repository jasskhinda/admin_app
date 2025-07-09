import { redirect } from 'next/navigation';
import AdminFacilitiesView from './AdminFacilitiesView';
import { createClient } from '@/utils/supabase/server';

export default async function FacilitiesPage() {
  const supabase = await createClient();
  
  try {
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Facilities page auth error:', userError);
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
      console.log('Not an admin in facilities page');
      redirect('/login?error=Admin%20access%20required');
    }
    
    // Try different approaches to fetch facilities
    let facilities = [];
    let facilitiesError = null;
    
    try {
      // First try: Regular query
      const { data: regularFacilities, error: regularError } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (regularError) {
        console.error('Regular query error:', regularError);
        
        // Second try: Use admin client with service role
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
          const { data: adminFacilities, error: adminError } = await supabaseAdmin
            .from('facilities')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (adminError) {
            console.error('Admin query error:', adminError);
            facilitiesError = adminError;
          } else {
            facilities = adminFacilities || [];
            console.log('Admin facilities fetched:', facilities.length);
          }
        } else {
          facilitiesError = regularError;
        }
      } else {
        facilities = regularFacilities || [];
        console.log('Regular facilities fetched:', facilities.length);
      }
    } catch (error) {
      console.error('Exception fetching facilities:', error);
      facilitiesError = error;
    }
    
    // Process facilities data to include counts (set to 0 for now)
    const processedFacilities = facilities.map(facility => ({
      ...facility,
      client_count: 0, // Will be enhanced later
      trip_count: 0,   // Will be enhanced later
      active_users: 0  // Will be enhanced later
    }));
    
    console.log('Processed facilities:', processedFacilities.length);
    
    // If no facilities found, let's add some debug info
    if (processedFacilities.length === 0) {
      console.log('No facilities found. Error:', facilitiesError);
      console.log('User profile:', profile);
    }
    
    return (
      <AdminFacilitiesView 
        user={user}
        userProfile={profile}
        facilities={processedFacilities}
      />
    );
    
  } catch (error) {
    console.error('Unexpected facilities page error:', error);
    redirect('/login?error=Unexpected%20error');
  }
}