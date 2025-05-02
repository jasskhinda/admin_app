'use client';

import { supabase } from './supabase';

/**
 * Helper function to ensure cookies are properly synchronized
 * This helps prevent "logged in but still redirected" issues
 * Uses auth-helpers-nextjs under the hood via the createClientComponentClient
 */
export async function refreshSession() {
  try {
    // Check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No session found during refresh');
      return null;
    }
    
    // Force refresh the session - auth-helpers-nextjs will ensure cookies are properly set
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
    
    console.log('Session refreshed successfully with auth-helpers');
    return data.session;
    
  } catch (err) {
    console.error('Unexpected error refreshing session:', err);
    return null;
  }
}

/**
 * Handle login with proper session synchronization using auth-helpers-nextjs
 * The createClientComponentClient in supabase.js handles cookie setting automatically
 */
export async function handleLogin(email, password) {
  try {
    if (!email || !password) {
      return { error: { message: 'Email and password are required' } };
    }
    
    // Attempt to sign in - createClientComponentClient will handle cookie setting
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error('Sign in error:', error.message);
      return { error };
    }
    
    if (!data?.user) {
      console.error('No user data returned from sign in');
      return { error: { message: 'Authentication failed' } };
    }
    
    // Session cookies are automatically set by auth-helpers-nextjs
    // but we'll still refresh to be sure
    await refreshSession();
    
    return data;
  } catch (err) {
    console.error('Login error:', err);
    return { error: { message: 'An unexpected error occurred' } };
  }
}