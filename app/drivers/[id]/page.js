import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

// This is a Server Component
export default async function DriverDetailPage({ params }) {
    const { id: driverId } = params;
    
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
        
        // Fetch driver details
        const { data: driver, error: driverError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', driverId)
            .eq('role', 'driver')
            .single();
            
        if (driverError || !driver) {
            redirect('/drivers?error=Driver%20not%20found');
        }

        // Get email from auth if not in profile
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin && !driver.email) {
            try {
                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(driverId);
                if (authUser?.email) {
                    driver.email = authUser.email;
                }
            } catch (error) {
                console.error('Error fetching email for driver:', driverId);
            }
        }

        // Get driver stats
        let tripStats = {
            total_trips: 0,
            completed_trips: 0,
            this_month_trips: 0,
            last_trip: null
        };

        // Get vehicle information
        let vehicle = null;
        try {
            const { data: vehicleData } = await supabase
                .from('vehicles')
                .select('*')
                .eq('driver_id', driverId)
                .single();
            vehicle = vehicleData;
        } catch (error) {
            console.warn('Could not fetch vehicle data:', error.message);
        }

        // Get trip statistics
        try {
            const { data: trips } = await supabase
                .from('trips')
                .select('*')
                .eq('driver_id', driverId)
                .order('created_at', { ascending: false });

            if (trips) {
                tripStats.total_trips = trips.length;
                tripStats.completed_trips = trips.filter(trip => trip.status === 'completed').length;
                tripStats.last_trip = trips.length > 0 ? trips[0] : null;
                
                // Calculate this month's trips
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                tripStats.this_month_trips = trips.filter(trip => 
                    new Date(trip.created_at) >= startOfMonth
                ).length;
            }
        } catch (error) {
            console.warn('Could not fetch trip stats:', error.message);
        }

        const formatDate = (dateString) => {
            if (!dateString) return 'Never';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const getStatusBadge = (status) => {
            if (!status) status = 'inactive';
            
            const statusConfig = {
                active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
                inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
                on_trip: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'On Trip' },
                pending_verification: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Verification' },
            };
            
            const config = statusConfig[status] || statusConfig.inactive;
            
            return (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                </span>
            );
        };

        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Driver Details</h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    Comprehensive driver profile and performance metrics
                                </p>
                            </div>
                            <Link
                                href="/drivers"
                                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Drivers
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Driver Information */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Personal Information Card */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center mb-6">
                                    <div className="flex-shrink-0 h-16 w-16">
                                        <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-6">
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unnamed Driver'}
                                        </h2>
                                        <p className="text-sm text-gray-500">Driver ID: {driver.id}</p>
                                        <div className="mt-2">
                                            {getStatusBadge(driver.status)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Email</p>
                                                <p className="text-sm text-gray-900">{driver.email || 'Not provided'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Phone</p>
                                                <p className="text-sm text-gray-900">{driver.phone_number || 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Information</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">First Name</p>
                                                <p className="text-sm text-gray-900">{driver.first_name || 'Not provided'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Last Name</p>
                                                <p className="text-sm text-gray-900">{driver.last_name || 'Not provided'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Join Date</p>
                                                <p className="text-sm text-gray-900">{formatDate(driver.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Information Card */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
                                {vehicle ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Make & Model</p>
                                            <p className="text-sm text-gray-900">{vehicle.make} {vehicle.model}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">License Plate</p>
                                            <p className="text-sm text-gray-900">{vehicle.license_plate}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Year</p>
                                            <p className="text-sm text-gray-900">{vehicle.year || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Color</p>
                                            <p className="text-sm text-gray-900">{vehicle.color || 'Not specified'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p>No vehicle assigned</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar - Stats */}
                        <div className="space-y-6">
                            {/* Performance Stats */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Stats</h3>
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm font-medium text-blue-600">Total Trips</p>
                                        <p className="text-2xl font-bold text-blue-900">{tripStats.total_trips}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <p className="text-sm font-medium text-green-600">Completed</p>
                                        <p className="text-2xl font-bold text-green-900">{tripStats.completed_trips}</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <p className="text-sm font-medium text-purple-600">This Month</p>
                                        <p className="text-2xl font-bold text-purple-900">{tripStats.this_month_trips}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                                <div className="space-y-3">
                                    {tripStats.last_trip ? (
                                        <div className="border-l-4 border-blue-500 pl-4">
                                            <p className="text-sm font-medium text-gray-900">Last Trip</p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(tripStats.last_trip.created_at)}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                Status: {tripStats.last_trip.status}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-gray-500">
                                            <p className="text-sm">No recent trips</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                                <div className="space-y-3">
                                    <Link
                                        href={`/drivers/${driverId}/assign-trip`}
                                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Assign Trip
                                    </Link>
                                    <Link
                                        href={`/drivers/${driverId}/edit`}
                                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Driver
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error in driver detail page:', error);
        redirect('/drivers?error=server_error');
    }
}