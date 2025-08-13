import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DatabaseCleanupView from './DatabaseCleanupView';

export default async function DatabaseCleanupPage() {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login?error=Admin%20access%20required');
  }

  // Additional check: Only j.khinda@ccgrhc.com can access DB Cleanup
  if (user.email !== 'j.khinda@ccgrhc.com') {
    redirect('/dashboard?error=Super%20admin%20access%20required%20for%20DB%20Cleanup');
  }

  return <DatabaseCleanupView user={user} userProfile={profile} />;
}