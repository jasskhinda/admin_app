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

  return <DatabaseCleanupView user={user} userProfile={profile} />;
}