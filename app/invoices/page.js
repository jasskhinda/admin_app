import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminInvoicesView from './AdminInvoicesView';

// This is a Server Component
export default async function AdminInvoicesPage() {
    console.log('Admin invoices page server component executing');
    
    try {
        // Create server client
        const supabase = await createClient();
        
        // Check user - always use getUser for security
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // Redirect to login if there's no user
        if (userError || !user) {
            console.error('Auth error:', userError);
            redirect('/login');
        }

        // Get user profile and verify it has admin role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            redirect('/login?error=Access%20denied.%20Admin%20privileges%20required.');
        }
        
        // Fetch invoices with client information
        let invoices = [];
        
        try {
            const { data: invoiceData, error: invoicesError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    user_id!inner (
                        id,
                        email,
                        full_name
                    ),
                    trip_id (
                        id,
                        pickup_address,
                        destination_address,
                        pickup_time
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (invoicesError) {
                console.error('Error fetching invoices:', invoicesError);
            } else {
                invoices = invoiceData || [];
            }
        } catch (fetchError) {
            console.error('Exception in invoices fetching:', fetchError);
            invoices = [];
        }
        
        console.log(`Successfully fetched ${invoices.length} invoices`);

        // Calculate summary statistics for the view
        const invoiceStats = {
            total: invoices.length,
            paid: invoices.filter(inv => inv.status === 'paid').length,
            pending: invoices.filter(inv => inv.status === 'pending').length,
            overdue: invoices.filter(inv => inv.status === 'overdue').length,
            cancelled: invoices.filter(inv => inv.status === 'cancelled').length,
            refunded: invoices.filter(inv => inv.status === 'refunded').length,
            totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.total || inv.amount || 0), 0),
            paidAmount: invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + parseFloat(inv.total || inv.amount || 0), 0),
            pendingAmount: invoices
                .filter(inv => ['pending', 'overdue'].includes(inv.status))
                .reduce((sum, inv) => sum + parseFloat(inv.total || inv.amount || 0), 0)
        };
        
        return <AdminInvoicesView 
            user={user} 
            userProfile={profile} 
            invoices={invoices}
            invoiceStats={invoiceStats}
        />;
    } catch (error) {
        console.error('Error in admin invoices page:', error);
        redirect('/login?error=server_error');
    }
}