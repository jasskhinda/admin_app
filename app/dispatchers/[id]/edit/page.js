import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import EditDispatcherForm from './EditDispatcherForm';

export default async function EditDispatcherPage({ params }) {
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
  
  // Get dispatcher details
  const { data: dispatcher, error: dispatcherError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .eq('role', 'dispatcher')
    .single();
  
  if (dispatcherError || !dispatcher) {
    redirect('/dispatchers?error=Dispatcher%20not%20found');
  }
  
  return (
    <EditDispatcherForm 
      user={user} 
      userProfile={profile} 
      dispatcher={dispatcher}
    />
  );
}