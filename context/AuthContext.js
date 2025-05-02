'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { refreshSession } from '@/lib/auth-helpers';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile data including role with improved error handling
    const fetchUserProfile = async(userId, retryCount = 0) => {
        try {
            console.log(`Fetching profile for user ID: ${userId} (attempt ${retryCount + 1})`);
            
            if (!userId) {
                console.error('No user ID provided to fetchUserProfile');
                return null;
            }
            
            // Try using the select() with a more explicit query
            const { data, error } = await supabase
                .from('profiles')
                .select('id, role, full_name, phone, status')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                
                // Retry up to 2 times with increasing delay for network errors
                if (retryCount < 2) {
                    console.log(`Retrying profile fetch in ${(retryCount + 1) * 1000}ms`);
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve(fetchUserProfile(userId, retryCount + 1));
                        }, (retryCount + 1) * 1000);
                    });
                }
                
                return null;
            }

            console.log('Profile found:', data);
            return data;
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
            
            // Retry on timeout or network error
            if (retryCount < 2) {
                console.log(`Retrying profile fetch in ${(retryCount + 1) * 1000}ms`);
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(fetchUserProfile(userId, retryCount + 1));
                    }, (retryCount + 1) * 1000);
                });
            }
            
            return null;
        }
    };

    useEffect(() => {
        let isMounted = true;
        
        const setupAuthChangeHandler = async() => {
            // Auth state change listener
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async(event, session) => {
                // Only process if component is still mounted
                if (!isMounted) return;
                
                console.log('Auth state changed:', event);
                
                if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
                    if (session?.user) {
                        console.log('User is authenticated:', session.user.email);
                        setUser(session.user);
                        
                        // Wait a short time to ensure auth is fully processed before fetching profile
                        setTimeout(async () => {
                            if (!isMounted) return;
                            
                            // Fetch user profile with role information
                            const profile = await fetchUserProfile(session.user.id);
                            if (profile && isMounted) {
                                console.log('Setting user profile in context:', profile);
                                setUserProfile(profile);
                            } else {
                                console.warn('Could not fetch profile after authentication');
                            }
                        }, 500);
                    } else {
                        console.log('User is not authenticated');
                        setUser(null);
                        setUserProfile(null);
                    }
                }
                
                if (isMounted) {
                    setLoading(false);
                }
            });

            try {
                // Check current session
                const { data } = await supabase.auth.getSession();
                
                if (data?.session?.user && isMounted) {
                    console.log('Initial session user found:', data.session.user.email);
                    setUser(data.session.user);
                    
                    // Try to refresh for good measure
                    refreshSession().catch(err => {
                        console.warn('Session refresh failed:', err.message);
                    });
                    
                    // Fetch user profile
                    const profile = await fetchUserProfile(data.session.user.id);
                    if (profile && isMounted) {
                        console.log('Setting initial user profile:', profile);
                        setUserProfile(profile);
                    } else {
                        console.warn('Could not fetch initial profile');
                    }
                } else {
                    console.log('No initial session found');
                }
            } catch (error) {
                console.error('Session initialization error:', error);
            }
            
            if (isMounted) {
                setLoading(false);
            }

            return () => {
                subscription.unsubscribe();
            };
        };

        setupAuthChangeHandler();
        
        return () => {
            isMounted = false;
        };
    }, []);

    // Custom sign in function that verifies the user's role
    const signInWithRole = async(email, password, requiredRole = 'dispatcher') => {
        try {
            console.log('Attempting to sign in with email:', email);
            
            // Sign in
            const { data, error } = await supabase.auth.signInWithPassword({ 
                email, 
                password 
            });

            if (error) {
                console.error('Sign in error:', error.message);
                return { error };
            }

            // If sign in succeeds
            if (data?.user) {
                console.log('User signed in successfully, checking profile');
                
                // Give a small delay to ensure auth is processed
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Fetch the profile
                const profile = await fetchUserProfile(data.user.id);
                
                // Set the user
                setUser(data.user);

                if (!profile) {
                    console.warn('No profile found for user ID:', data.user.id);
                    // Profile doesn't exist
                    await supabase.auth.signOut(); // Sign out immediately
                    return {
                        error: {
                            message: 'User profile not found. Please contact support.'
                        }
                    };
                }

                if (profile.role !== requiredRole) {
                    // User doesn't have the required role
                    await supabase.auth.signOut(); // Sign out immediately
                    return {
                        error: {
                            message: `Access denied. This application is only for ${requiredRole}s.`
                        }
                    };
                }

                // Set the profile in state
                setUserProfile(profile);
                console.log('Dispatcher authentication successful');
                return data;
            }

            console.error('No user data returned from sign in');
            return { error: { message: 'Unknown error during authentication' } };
        } catch (err) {
            console.error('Error in signInWithRole:', err);
            return { error: { message: 'An unexpected error occurred' } };
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        signUp: (email, password) => supabase.auth.signUp({ email, password }),
        signIn: (email, password) => signInWithRole(email, password, 'dispatcher'),
        signOut: () => supabase.auth.signOut(),
        hasRole: (role) => userProfile?.role === role,
        isDispatcher: () => userProfile?.role === 'dispatcher',
        refreshProfile: () => user?.id ? fetchUserProfile(user.id) : Promise.resolve(null),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}