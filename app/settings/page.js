import { redirect } from 'next/navigation';
import SettingsView from './SettingsView';
import { createClient } from '@/utils/supabase/server';

export default async function SettingsPage() {
  const supabase = await createClient();
  
  try {
    // Get the user - always use getUser for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Settings auth error:', userError);
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
      console.log('Not an admin in settings check');
      redirect('/login?error=Admin%20access%20required');
    }
    
    console.log('Admin authenticated in settings, profile ID:', profile.id);
  } catch (error) {
    console.error('Unexpected settings auth error:', error);
    redirect('/login?error=Unexpected%20error');
  }
  
  return <SettingsView />;
}