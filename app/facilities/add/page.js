import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminHeader from '../../components/AdminHeader';
import AddFacilityFormNew from './AddFacilityFormNew';

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
  
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <AddFacilityFormNew />
        </div>
      </main>
    </div>
  );
}