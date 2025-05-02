'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthDebug({ visible = false }) {
  const [state, setState] = useState({
    session: null,
    loading: true,
    error: null,
    profile: null
  });

  useEffect(() => {
    if (!visible) return;
    
    async function checkAuth() {
      try {
        setState(prev => ({ ...prev, loading: true }));
        
        // Check session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setState(prev => ({ 
            ...prev, 
            error: error.message,
            loading: false 
          }));
          return;
        }
        
        setState(prev => ({ 
          ...prev, 
          session: data.session ? {
            userId: data.session.user?.id,
            email: data.session.user?.email,
            expires: new Date(data.session.expires_at * 1000).toISOString()
          } : null
        }));
        
        // If we have a session, try to fetch profile
        if (data.session?.user?.id) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, status')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileError) {
            setState(prev => ({ 
              ...prev, 
              error: `Profile error: ${profileError.message}`,
              loading: false 
            }));
            return;
          }
          
          setState(prev => ({ 
            ...prev, 
            profile,
            loading: false 
          }));
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        setState(prev => ({ 
          ...prev, 
          error: `Unexpected error: ${err.message}`,
          loading: false 
        }));
      }
    }
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        checkAuth();
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 text-xs font-mono overflow-auto max-h-48">
      <h4 className="font-bold mb-2">Auth Debug</h4>
      {state.loading ? (
        <p>Loading auth state...</p>
      ) : (
        <div>
          <div className="mb-2">
            <strong>Session:</strong>{' '}
            {state.session ? (
              <span className="text-green-600 dark:text-green-400">
                Active (User: {state.session.email})
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">None</span>
            )}
          </div>
          
          {state.profile && (
            <div className="mb-2">
              <strong>Profile:</strong>{' '}
              <span className={state.profile.role === 'admin' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                Role: {state.profile.role}, Status: {state.profile.status || 'unknown'}
              </span>
            </div>
          )}
          
          {state.error && (
            <div className="text-red-600 dark:text-red-400">
              <strong>Error:</strong> {state.error}
            </div>
          )}
          
          <div className="mt-2">
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-2 py-1 bg-red-600 text-white rounded text-xs"
            >
              Sign Out
            </button>
            <button
              onClick={async () => {
                try {
                  await supabase.auth.refreshSession();
                  checkAuth();
                } catch (err) {
                  console.error('Refresh failed:', err);
                }
              }}
              className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}