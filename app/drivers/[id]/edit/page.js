import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import EditDriverForm from './EditDriverForm';

export default async function EditDriverPage({ params }) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login?error=Authentication%20required');
  }
  
  // Get user profile to verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login?error=Admin%20access%20required');
  }
  
  // Get driver information
  const { data: driver, error: driverError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .eq('role', 'driver')
    .single();
  
  if (driverError || !driver) {
    redirect('/drivers?error=Driver%20not%20found');
  }
  
  return <EditDriverForm driver={driver} user={user} userProfile={profile} />;
}