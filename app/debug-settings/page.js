'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

export default function DebugSettingsPage() {
  const { user, userProfile, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState(null);
  const [apiDebug, setApiDebug] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    // Client-side debug info
    setDebugInfo({
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      authLoading: loading,
      hasUser: !!user,
      hasProfile: !!userProfile,
      userEmail: user?.email,
      profileRole: userProfile?.role
    });

    // Test API endpoint
    fetch('/api/debug/settings')
      .then(res => res.json())
      .then(data => setApiDebug(data))
      .catch(err => setApiDebug({ error: 'API call failed', details: err.message }));
  }, [user, userProfile, loading]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client-side Debug */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Client-side Debug</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Server-side Debug */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Server-side Debug</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(apiDebug, null, 2)}
          </pre>
        </div>
      </div>

      {/* Auth Provider State */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Auth Provider State</h2>
        <div className="space-y-2">
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>User:</strong> {user ? `${user.email} (${user.id})` : 'None'}</p>
          <p><strong>Profile:</strong> {userProfile ? `${userProfile.full_name} (${userProfile.role})` : 'None'}</p>
        </div>
      </div>

      {/* Manual Test Buttons */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Manual Tests</h2>
        <div className="space-x-4">
          <button
            onClick={async () => {
              try {
                const { data, error } = await supabase.auth.getUser();
                alert(`User: ${JSON.stringify({ data, error }, null, 2)}`);
              } catch (err) {
                alert(`Error: ${err.message}`);
              }
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test getUser()
          </button>
          
          <button
            onClick={async () => {
              try {
                const { data, error } = await supabase.from('profiles').select('*').limit(1);
                alert(`Profiles: ${JSON.stringify({ data, error }, null, 2)}`);
              } catch (err) {
                alert(`Error: ${err.message}`);
              }
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Test DB Query
          </button>
        </div>
      </div>
    </div>
  );
}