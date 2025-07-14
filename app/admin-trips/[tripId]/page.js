import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminLayout from '@/app/components/AdminLayout';

// This is a Server Component
export default async function AdminTripDetailsPage({ params }) {
    const { tripId } = params;
    
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

        if (profileError || !profile || !['admin', 'dispatcher'].includes(profile.role)) {
            redirect('/login?error=Access%20denied.%20Admin%20or%20dispatcher%20privileges%20required.');
        }
        
        // Fetch trip details with related data
        let trip = null;
        let tripError = null;
        
        try {
            const { data: tripData, error: fetchError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single();
                
            if (fetchError) {
                console.error('Error fetching trip:', fetchError);
                tripError = fetchError;
            } else if (tripData) {
                trip = tripData;
                console.log('Trip data found:', {
                    id: trip.id,
                    user_id: trip.user_id,
                    managed_client_id: trip.managed_client_id,
                    facility_id: trip.facility_id,
                    status: trip.status,
                    client_name: trip.client_name,
                    passenger_name: trip.passenger_name
                });
                
                // Fetch client information - prioritize facility_managed_clients for facility trips
                if (trip.managed_client_id) {
                    // For facility trips, try facility_managed_clients table first
                    if (trip.facility_id) {
                        try {
                            const { data: facilityClient } = await supabase
                                .from('facility_managed_clients')
                                .select('id, first_name, last_name, email, phone_number')
                                .eq('id', trip.managed_client_id)
                                .single();
                            
                            if (facilityClient) {
                                console.log(`Found facility managed client:`, facilityClient);
                                trip.client = {
                                    id: facilityClient.id,
                                    first_name: facilityClient.first_name,
                                    last_name: facilityClient.last_name,
                                    full_name: `${facilityClient.first_name} ${facilityClient.last_name}`,
                                    email: facilityClient.email,
                                    phone_number: facilityClient.phone_number,
                                    role: 'facility_client'
                                };
                            }
                        } catch (facilityClientError) {
                            console.warn('Could not fetch facility managed client, trying profiles table');
                        }
                    }
                    
                    // If not found in facility_managed_clients, try profiles table
                    if (!trip.client) {
                        try {
                            const { data: clientProfile } = await supabase
                                .from('profiles')
                                .select('id, first_name, last_name, full_name, email, phone_number, role')
                                .eq('id', trip.managed_client_id)
                                .single();
                            
                            if (clientProfile) {
                                console.log(`Found client profile:`, clientProfile);
                                trip.client = clientProfile;
                            }
                        } catch (clientError) {
                            console.warn('Could not fetch client from profiles table');
                        }
                    }
                } else if (trip.user_id) {
                    try {
                        const { data: clientProfile } = await supabase
                            .from('profiles')
                            .select('id, first_name, last_name, full_name, email, phone_number, role')
                            .eq('id', trip.user_id)
                            .single();
                        
                        if (clientProfile) {
                            trip.client = clientProfile;
                        }
                    } catch (clientError) {
                        console.warn('Could not fetch client for user_id');
                    }
                }
                
                // If no client found, create fallback from trip data
                if (!trip.client) {
                    console.log('No client profile found, creating fallback from trip data');
                    trip.client = {
                        id: trip.managed_client_id || trip.user_id || null,
                        first_name: trip.client_name ? trip.client_name.split(' ')[0] : '',
                        last_name: trip.client_name ? trip.client_name.split(' ').slice(1).join(' ') : '',
                        full_name: trip.client_name || trip.passenger_name || 'Unknown Client',
                        email: trip.client_email || 'No email available',
                        phone_number: trip.client_phone || null,
                        role: trip.facility_id ? 'facility_client' : 'client'
                    };
                    console.log('Created fallback client:', trip.client);
                }
                
                // Fetch facility information if exists
                if (trip.facility_id) {
                    try {
                        const { data: facilityData } = await supabase
                            .from('facilities')
                            .select('id, name, address, phone_number, contact_email')
                            .eq('id', trip.facility_id)
                            .single();
                        
                        if (facilityData) {
                            trip.facility = facilityData;
                        }
                    } catch (facilityError) {
                        console.warn('Could not fetch facility');
                    }
                }
                
                // Fetch driver information if assigned
                if (trip.driver_id) {
                    try {
                        const { data: driverProfile } = await supabase
                            .from('profiles')
                            .select('id, first_name, last_name, full_name, email, phone_number, role')
                            .eq('id', trip.driver_id)
                            .single();
                        
                        if (driverProfile) {
                            trip.driver = driverProfile;
                        }
                    } catch (driverError) {
                        console.warn('Could not fetch driver');
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching trip details:', error);
            tripError = error;
        }

        return (
            <AdminLayout user={user} userProfile={profile}>
                <div className="min-h-screen bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Trip Details</h1>
                                    <p className="mt-2 text-sm text-gray-600">
                                        View detailed information about this trip
                                    </p>
                                </div>
                                <div className="flex space-x-3">
                                    <a
                                        href="javascript:history.back()"
                                        className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back
                                    </a>
                                </div>
                            </div>
                        </div>

                        {tripError ? (
                            <div className="bg-white shadow rounded-lg p-6">
                                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                                    <p className="text-sm text-red-700">Error loading trip: {tripError.message}</p>
                                </div>
                            </div>
                        ) : !trip ? (
                            <div className="bg-white shadow rounded-lg p-6">
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                                    <p className="text-sm text-yellow-700">Trip not found</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Trip Information - Main Column */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Trip Details Card */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                        <div className="px-6 py-4 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium text-gray-900">Trip Information</h3>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    trip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                                    trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                                    trip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                                    trip.status === 'upcoming' ? 'bg-purple-100 text-purple-800' : 
                                                    trip.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {trip.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Pickup Time</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {trip.pickup_time ? new Date(trip.pickup_time).toLocaleDateString('en-US', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : 'Not scheduled'}
                                                    </dd>
                                                </div>
                                                
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {new Date(trip.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </dd>
                                                </div>
                                                
                                                <div className="col-span-2">
                                                    <dt className="text-sm font-medium text-gray-500">Route</dt>
                                                    <dd className="mt-1 text-sm">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center">
                                                                <span className="h-2 w-2 rounded-full bg-green-500 mr-3"></span>
                                                                <span className="text-gray-900 font-medium">From:</span>
                                                                <span className="ml-2 text-gray-700">{trip.pickup_address || 'Not specified'}</span>
                                                            </div>
                                                            {trip.pickup_details && (
                                                                <div className="ml-5 text-sm text-gray-600">
                                                                    {trip.pickup_details}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center">
                                                                <span className="h-2 w-2 rounded-full bg-red-500 mr-3"></span>
                                                                <span className="text-gray-900 font-medium">To:</span>
                                                                <span className="ml-2 text-gray-700">{trip.destination_address || trip.dropoff_address || 'Not specified'}</span>
                                                            </div>
                                                            {trip.destination_details && (
                                                                <div className="ml-5 text-sm text-gray-600">
                                                                    {trip.destination_details}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </dd>
                                                </div>
                                                
                                                {trip.distance && (
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Distance</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">{trip.distance} miles</dd>
                                                    </div>
                                                )}
                                                
                                                {trip.price && (
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Price</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">${trip.price}</dd>
                                                    </div>
                                                )}
                                                
                                                {trip.wheelchair_type && trip.wheelchair_type !== 'no_wheelchair' && (
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Wheelchair</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">{trip.wheelchair_type.replace('_', ' ')}</dd>
                                                    </div>
                                                )}
                                                
                                                {trip.additional_passengers > 0 && (
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Additional Passengers</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">{trip.additional_passengers}</dd>
                                                    </div>
                                                )}
                                                
                                                {trip.is_round_trip && (
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Round Trip</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">Yes</dd>
                                                    </div>
                                                )}
                                                
                                                {trip.trip_notes && (
                                                    <div className="col-span-2">
                                                        <dt className="text-sm font-medium text-gray-500">Notes</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">{trip.trip_notes}</dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Sidebar Information */}
                                <div className="space-y-6">
                                    {/* Client Information */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                        <div className="px-6 py-4 border-b border-gray-200">
                                            <h3 className="text-lg font-medium text-gray-900">Client Information</h3>
                                        </div>
                                        <div className="p-6">
                                            {trip.client ? (
                                                <dl className="space-y-3">
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">
                                                            {trip.client.full_name || `${trip.client.first_name || ''} ${trip.client.last_name || ''}`.trim() || 'Unknown'}
                                                        </dd>
                                                    </div>
                                                    {trip.client.email && (
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{trip.client.email}</dd>
                                                        </div>
                                                    )}
                                                    {trip.client.phone_number && (
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{trip.client.phone_number}</dd>
                                                        </div>
                                                    )}
                                                </dl>
                                            ) : (
                                                <p className="text-sm text-gray-500">Client information not available</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Facility Information */}
                                    {trip.facility && (
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                            <div className="px-6 py-4 border-b border-gray-200">
                                                <h3 className="text-lg font-medium text-gray-900">Facility Information</h3>
                                            </div>
                                            <div className="p-6">
                                                <dl className="space-y-3">
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">{trip.facility.name}</dd>
                                                    </div>
                                                    {trip.facility.contact_email && (
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{trip.facility.contact_email}</dd>
                                                        </div>
                                                    )}
                                                    {trip.facility.phone_number && (
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{trip.facility.phone_number}</dd>
                                                        </div>
                                                    )}
                                                    {trip.facility.address && (
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{trip.facility.address}</dd>
                                                        </div>
                                                    )}
                                                </dl>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Driver Information */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                        <div className="px-6 py-4 border-b border-gray-200">
                                            <h3 className="text-lg font-medium text-gray-900">Driver Information</h3>
                                        </div>
                                        <div className="p-6">
                                            {trip.driver ? (
                                                <dl className="space-y-3">
                                                    <div>
                                                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                                                        <dd className="mt-1 text-sm text-gray-900">
                                                            {trip.driver.full_name || `${trip.driver.first_name || ''} ${trip.driver.last_name || ''}`.trim() || 'Unknown'}
                                                        </dd>
                                                    </div>
                                                    {trip.driver.email && (
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{trip.driver.email}</dd>
                                                        </div>
                                                    )}
                                                    {trip.driver.phone_number && (
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{trip.driver.phone_number}</dd>
                                                        </div>
                                                    )}
                                                </dl>
                                            ) : (
                                                <div>
                                                    <p className="text-sm text-gray-500 mb-4">No driver assigned to this trip</p>
                                                    <a
                                                        href="/drivers"
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        Assign Driver
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </AdminLayout>
        );
    } catch (error) {
        console.error('Error in admin trip details page:', error);
        redirect('/dashboard?error=server_error');
    }
}