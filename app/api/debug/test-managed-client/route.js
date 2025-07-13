import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Test the specific managed_client_id we saw in the debug data
    const managedClientId = '72a44be8-8e3b-4626-854e-39d5ea79223a';
    
    const results = {};
    
    // Try to fetch the profile directly
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', managedClientId)
        .single();
      
      results.direct_profile_lookup = { data: profile, error: error?.message };
    } catch (err) {
      results.direct_profile_lookup = { error: err.message };
    }
    
    // Try auth lookup
    try {
      const { supabaseAdmin } = await import('@/lib/admin-supabase');
      if (supabaseAdmin) {
        const { data: { user: authUser }, error } = await supabaseAdmin.auth.admin.getUserById(managedClientId);
        results.auth_lookup = { data: authUser, error: error?.message };
      } else {
        results.auth_lookup = { error: 'Admin client not available' };
      }
    } catch (err) {
      results.auth_lookup = { error: err.message };
    }
    
    // Check if it exists in facility_clients
    try {
      const { data: facilityClient, error } = await supabase
        .from('facility_clients')
        .select(`
          *,
          profiles:client_id (*)
        `)
        .eq('client_id', managedClientId);
      
      results.facility_clients_lookup = { data: facilityClient, error: error?.message };
    } catch (err) {
      results.facility_clients_lookup = { error: err.message };
    }
    
    // Get all profiles to see what exists
    try {
      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .limit(10);
      
      results.sample_profiles = { data: allProfiles, error: error?.message };
    } catch (err) {
      results.sample_profiles = { error: err.message };
    }
    
    return NextResponse.json(results);
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}