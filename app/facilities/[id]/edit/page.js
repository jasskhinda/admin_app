import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import EditFacilityForm from './EditFacilityForm';

export default async function EditFacilityPage({ params }) {
  const supabase = await createClient();
  
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

  // Get facility data
  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', params.id)
    .single();

  if (facilityError || !facility) {
    redirect('/facilities');
  }
  
  return <EditFacilityForm facility={facility} />;
}