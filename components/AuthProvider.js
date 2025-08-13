'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('AuthProvider timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setUser(session?.user || null);
        
        // Don't refetch profile for certain events that don't change profile data
        if (event === 'USER_UPDATED' && userProfile) {
          console.log('Skipping profile refetch for USER_UPDATED event');
          setLoading(false);
          return;
        }
        
        setLoading(true);

        if (session?.user) {
          try {
            console.log('Fetching profile for user:', session.user.id);
            
            // Add timeout for profile fetch
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );
            
            const { data: profile, error: profileError } = await Promise.race([
              profilePromise,
              timeoutPromise
            ]);

            if (profileError) {
              console.error('Profile fetch error:', profileError);
              setUserProfile(null);
            } else {
              console.log('Profile loaded:', profile);
              setUserProfile(profile || null);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }

        setLoading(false);
      }
    );

    // Initial session check
    const checkUser = async () => {
      try {
        console.log('Initial user check...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User check error:', userError);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        setUser(user);

        if (user) {
          console.log('Initial profile fetch for user:', user.id);
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Initial profile fetch error:', profileError);
            setUserProfile(null);
          } else {
            console.log('Initial profile loaded:', profile);
            setUserProfile(profile || null);
          }
        } else {
          console.log('No user found');
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = {
    user,
    userProfile,
    loading,
    signOut,
    supabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}