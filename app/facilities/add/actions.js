'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function createFacility(formData) {
  console.log('SERVER ACTION: Starting facility creation with data:', formData);
  
  try {
    const supabase = await createClient();
    console.log('SERVER ACTION: Supabase client created');
    
    // Check auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('SERVER ACTION: User check result:', { user: !!user, error: userError });
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('SERVER ACTION: Profile check result:', { profile, error: profileError });
      
    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    // Prepare facility data
    const facilityData = {
      name: formData.name,
      contact_email: formData.contact_email,
      billing_email: formData.billing_email || formData.contact_email,
      phone_number: formData.phone_number,
      address: formData.address,
      facility_type: formData.facility_type,
      status: formData.status || 'active'
    };
    
    console.log('SERVER ACTION: Inserting facility with data:', facilityData);
    
    // Create facility
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .insert([facilityData])
      .select()
      .single();
      
    console.log('SERVER ACTION: Insert result:', { facility, error: facilityError });
      
    if (facilityError) {
      console.error('SERVER ACTION: Facility creation error:', facilityError);
      throw new Error(facilityError.message);
    }
    
    console.log('SERVER ACTION: Facility created successfully, redirecting...');
    
    // Redirect on success
    redirect('/facilities');
  } catch (error) {
    console.error('SERVER ACTION: Caught error:', error);
    throw error;
  }
}