'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DebugPage() {
  const [status, setStatus] = useState('Loading...');
  const [details, setDetails] = useState({});
  const supabase = createClient();

  useEffect(() => {
    const runDebug = async () => {
      try {
        setStatus('Checking client-side authentication...');
        
        // Check client-side session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        setDetails(prev => ({
          ...prev,
          clientSession: session ? { userId: session.user.id, email: session.user.email } : null,
          clientSessionError: sessionError?.message || null
        }));
        
        if (!session) {
          setStatus('No client-side session found');
          return;
        }
        
        setStatus('Checking server-side authentication...');
        
        // Check server-side via API
        const response = await fetch('/api/debug-auth');
        const serverAuth = await response.json();
        
        setDetails(prev => ({
          ...prev,
          serverAuth
        }));
        
        if (serverAuth.authenticated && serverAuth.hasAdminRole) {
          setStatus('✅ All checks passed - user should have access');
        } else if (serverAuth.authenticated && !serverAuth.hasAdminRole) {
          setStatus('❌ User authenticated but not admin role');
        } else {
          setStatus('❌ Server-side authentication failed');
        }
        
        // Check if we can access profiles table directly
        setStatus('Checking direct database access...');
        
        const { data: profileCheck, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setDetails(prev => ({
          ...prev,
          directProfileCheck: profileCheck,
          directProfileError: profileError?.message || null
        }));
        
        if (profileCheck?.role === 'admin') {
          setStatus('✅ Direct profile check confirms admin access');
        } else {
          setStatus(`❌ Direct profile check failed: ${profileError?.message || 'No admin role'}`);
        }
        
      } catch (error) {
        setStatus('❌ Error during debug: ' + error.message);
        setDetails(prev => ({
          ...prev,
          debugError: error.message
        }));
      }
    };
    
    runDebug();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Status</h2>
          <p className="text-lg">{status}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Debug Details</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
        
        <div className="mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Debug
          </button>
          
          <a
            href="/clients/add"
            className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
          >
            Try Clients Add Page
          </a>
        </div>
      </div>
    </div>
  );
}