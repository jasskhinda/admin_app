import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AddFacilityForm from './AddFacilityForm';

export default async function AddFacilityPage() {
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
  
  return <AddFacilityForm />;
}