import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function TestTripsPage() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  // Try to fetch trips
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .limit(5);
  
  // Try to count all trips
  const { count: totalTrips, error: countError } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true });
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Trips Access</h1>
      
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold">User Info:</h2>
        <pre className="text-xs">{JSON.stringify({ userId: user.id, email: user.email }, null, 2)}</pre>
      </div>
      
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold">Profile:</h2>
        <pre className="text-xs">{JSON.stringify(profile, null, 2)}</pre>
      </div>
      
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold">Total Trips Count:</h2>
        <p>Count: {totalTrips ?? 'null'}</p>
        {countError && <p className="text-red-500">Error: {countError.message}</p>}
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold">Trips Query Result:</h2>
        <p>Found {trips?.length ?? 0} trips</p>
        {tripsError && <p className="text-red-500">Error: {tripsError.message}</p>}
        {trips && trips.length > 0 && (
          <pre className="text-xs mt-2">{JSON.stringify(trips[0], null, 2)}</pre>
        )}
      </div>
    </div>
  );
}