import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function TestDBPage() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }
  
  // Test 1: Can we select from facilities?
  let selectTest = { success: false, error: null, count: null };
  try {
    const { count, error } = await supabase
      .from('facilities')
      .select('*', { count: 'exact', head: true });
    
    selectTest = { success: !error, error: error?.message, count };
  } catch (e) {
    selectTest = { success: false, error: e.message, count: null };
  }
  
  // Test 2: Check RLS policies
  let rlsTest = { success: false, policies: [] };
  try {
    const { data, error } = await supabase
      .rpc('get_policies', { table_name: 'facilities' })
      .select('*');
    
    if (!error && data) {
      rlsTest = { success: true, policies: data };
    }
  } catch (e) {
    // Try alternative query
    try {
      const { data, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'facilities');
      
      if (!error && data) {
        rlsTest = { success: true, policies: data };
      }
    } catch (e2) {
      rlsTest = { success: false, policies: [], error: e2.message };
    }
  }
  
  // Test 3: Simple insert test
  let insertTest = { success: false, error: null };
  const testData = {
    name: 'Test Facility ' + Date.now(),
    contact_email: 'test' + Date.now() + '@test.com',
    phone_number: '555-0000',
    address: '123 Test St',
    facility_type: 'Hospital',
    status: 'active',
    created_by: user.id
  };
  
  try {
    const { data, error } = await supabase
      .from('facilities')
      .insert([testData])
      .select();
    
    insertTest = { success: !error, error: error?.message, data };
    
    // If successful, delete the test record
    if (data && data[0]) {
      await supabase
        .from('facilities')
        .delete()
        .eq('id', data[0].id);
    }
  } catch (e) {
    insertTest = { success: false, error: e.message };
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <div className="space-y-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">1. Select Test (Can read facilities?)</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(selectTest, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">2. RLS Policies Test</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(rlsTest, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">3. Insert Test</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(insertTest, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">4. User Info</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify({ userId: user.id, email: user.email }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}