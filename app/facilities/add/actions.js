'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function createFacility(formData) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }
  
  // Check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
      
  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  // Simple facility data - only the basic fields
  const facilityData = {
    name: formData.name,
    contact_email: formData.contact_email,
    phone_number: formData.phone_number,
    address: formData.address,
    facility_type: formData.facility_type
  };
  
  // Add optional fields only if they exist
  if (formData.billing_email && formData.billing_email.trim()) {
    facilityData.billing_email = formData.billing_email;
  }
  
  if (formData.status) {
    facilityData.status = formData.status;
  }
  
  // Create facility without trying to set auto-generated fields
  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .insert([facilityData])
    .select()
    .single();
      
  if (facilityError) {
    throw new Error(`Database error: ${facilityError.message}`);
  }
  
  // Redirect on success
  redirect('/facilities');
}