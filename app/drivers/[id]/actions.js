'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function completeTrip(formData) {
    const tripId = formData.get('trip_id');
    
    if (!tripId) {
        redirect('/drivers?error=Trip ID is required');
    }
    
    try {
        const supabase = await createClient();
        
        // Verify admin access
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            redirect('/login');
        }
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
        if (!profile || !['admin', 'dispatcher'].includes(profile.role)) {
            redirect('/drivers?error=Access denied');
        }
        
        // Verify trip exists and is in progress
        const { data: trip, error: tripError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();
            
        if (tripError || !trip) {
            redirect('/drivers?error=Trip not found');
        }
        
        // Check if trip can be completed
        if (!['in_progress', 'upcoming', 'approved'].includes(trip.status)) {
            redirect(`/drivers/${trip.driver_id}?error=Trip cannot be completed from current status`);
        }
        
        // Update trip status to completed
        const { error: updateError } = await supabase
            .from('trips')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', tripId);
            
        if (updateError) {
            console.error('Error updating trip:', updateError);
            redirect(`/drivers/${trip.driver_id}?error=Error completing trip`);
        }
        
        // Update driver status to available if they were on this trip
        if (trip.driver_id) {
            try {
                await supabase
                    .from('profiles')
                    .update({ status: 'available' })
                    .eq('id', trip.driver_id);
            } catch (error) {
                console.warn('Could not update driver status:', error.message);
            }
        }
        
        // Revalidate and redirect
        revalidatePath(`/drivers/${trip.driver_id}`);
        redirect(`/drivers/${trip.driver_id}?success=Trip completed successfully`);
        
    } catch (error) {
        console.error('Error in trip completion:', error);
        redirect('/drivers?error=Internal server error');
    }
}