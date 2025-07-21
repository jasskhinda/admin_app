import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import TripCompleteButton from './TripCompleteButton';

// This is a Server Component
export default async function DriverDetailPage({ params, searchParams }) {
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

        // Get trip statistics and current trips
        let inProgressTrips = [];
        let completedTrips = [];
        
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
                
                // Separate trips by status
                inProgressTrips = trips.filter(trip => 
                    trip.status === 'in_progress' || trip.status === 'upcoming'
                );
                completedTrips = trips.filter(trip => 
                    trip.status === 'completed'
                ).slice(0, 10); // Show only recent 10 completed trips
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
                    {/* Success/Error Messages */}
                    {searchParams?.success && (
                        <div className="mb-4 p-4 border-l-4 border-green-500 bg-green-50 text-green-700 rounded">
                            <p>{decodeURIComponent(searchParams.success)}</p>
                        </div>
                    )}
                    {searchParams?.error && (
                        <div className="mb-4 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
                            <p>{decodeURIComponent(searchParams.error)}</p>
                        </div>
                    )}
                    
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

                    {/* Driver Info Card - Match assign-trip page style */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unnamed Driver'}
                                    </h3>
                                    <p className="text-sm text-gray-500">{driver.email}</p>
                                    <p className="text-xs text-blue-600 font-medium mt-1">🚗 Available for Assignment</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                        <circle cx={4} cy={4} r={3} />
                                    </svg>
                                    {driver.status === 'active' ? 'Active' : driver.status || 'Active'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Driver Information */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Personal Information Card */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Driver Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Full Name</p>
                                        <p className="text-sm text-gray-900 font-medium">{driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Email</p>
                                        <p className="text-sm text-gray-900">{driver.email || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Phone Number</p>
                                        <p className="text-sm text-gray-900">{driver.phone_number || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">First Name</p>
                                        <p className="text-sm text-gray-900">{driver.first_name || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Last Name</p>
                                        <p className="text-sm text-gray-900">{driver.last_name || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Driver ID</p>
                                        <p className="text-xs font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">{driver.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Status</p>
                                        <div className="mt-1">
                                            {getStatusBadge(driver.status)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Join Date</p>
                                        <p className="text-sm text-gray-900">{formatDate(driver.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Role</p>
                                        <p className="text-sm text-gray-900 capitalize">{driver.role || 'driver'}</p>
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
                            
                            {/* In Progress Trips */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">In Progress Trips</h3>
                                {inProgressTrips.length > 0 ? (
                                    <div className="space-y-4">
                                        {inProgressTrips.map((trip) => (
                                            <div key={trip.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {trip.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
                                                    </span>
                                                    <TripCompleteButton tripId={trip.id} />
                                                </div>
                                                <div className="text-sm text-gray-900 mb-1">
                                                    <strong>From:</strong> {trip.pickup_address}
                                                </div>
                                                <div className="text-sm text-gray-900 mb-1">
                                                    <strong>To:</strong> {trip.destination_address}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    <strong>Pickup:</strong> {new Date(trip.pickup_time).toLocaleString()}
                                                </div>
                                                {trip.price && (
                                                    <div className="text-sm text-gray-500">
                                                        <strong>Price:</strong> ${trip.price}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p>No active trips</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Completed Trips */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Completed Trips</h3>
                                {completedTrips.length > 0 ? (
                                    <div className="space-y-4">
                                        {completedTrips.map((trip) => (
                                            <div key={trip.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Completed
                                                    </span>
                                                    {trip.rating && (
                                                        <div className="flex items-center text-sm text-gray-500">
                                                            <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                            {trip.rating}/5
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-900 mb-1">
                                                    <strong>From:</strong> {trip.pickup_address}
                                                </div>
                                                <div className="text-sm text-gray-900 mb-1">
                                                    <strong>To:</strong> {trip.destination_address}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    <strong>Completed:</strong> {new Date(trip.updated_at).toLocaleString()}
                                                </div>
                                                {trip.price && (
                                                    <div className="text-sm text-gray-500">
                                                        <strong>Price:</strong> ${trip.price}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p>No completed trips</p>
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