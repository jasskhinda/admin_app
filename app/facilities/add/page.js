import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AddFacilityForm from './AddFacilityForm';

export default async function AddFacilityPage() {
  const supabase = await createClient();
  
  try {
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Add facility page auth error:', userError);
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
      console.log('Not an admin in add facility page');
      redirect('/login?error=Admin%20access%20required');
    }
    
    return (
      <AddFacilityForm 
        user={user}
        userProfile={profile}
      />
    );
    
  } catch (error) {
    console.error('Unexpected add facility page error:', error);
    redirect('/login?error=Unexpected%20error');
  }
}