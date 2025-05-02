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
                    client_id (
                        id,
                        email,
                        full_name
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
            unpaid: invoices.filter(inv => inv.status === 'unpaid').length,
            overdue: invoices.filter(inv => inv.status === 'overdue').length,
            totalAmount: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
            paidAmount: invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + (inv.amount || 0), 0),
            unpaidAmount: invoices
                .filter(inv => ['unpaid', 'overdue'].includes(inv.status))
                .reduce((sum, inv) => sum + (inv.amount || 0), 0)
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