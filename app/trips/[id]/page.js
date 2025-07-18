import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function TripDetails({ params }) {
  const tripId = params.id;
  const supabase = await createClient();
  
  // Check authentication and admin role
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login?error=Authentication%20required');
  }
  
  // Get user profile to verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/login?error=Admin%20access%20required');
  }
  
  // Fetch trip details with basic data first
  const { data: rawTrip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();
  
  if (tripError || !rawTrip) {
    console.error('Error fetching trip:', tripError);
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Trip Details</h1>
            <Link
              href="/trips"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Trips
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">Trip not found</p>
            </div>
            <div className="flex justify-center">
              <Link
                href="/trips"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Trips
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Enrich trip with related data
  const trip = { ...rawTrip };
  
  // Get user profile if user_id exists
  if (rawTrip.user_id) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, email, phone_number, role')
      .eq('id', rawTrip.user_id)
      .single();
    if (userProfile) trip.user_profile = userProfile;
  }
  
  // Get managed client if managed_client_id exists
  if (rawTrip.managed_client_id) {
    const { data: managedClient } = await supabase
      .from('facility_managed_clients')
      .select('id, first_name, last_name, email, phone_number')
      .eq('id', rawTrip.managed_client_id)
      .single();
    if (managedClient) trip.managed_client = managedClient;
  }
  
  // Get facility if facility_id exists
  if (rawTrip.facility_id) {
    const { data: facility } = await supabase
      .from('facilities')
      .select('id, name, contact_email, phone_number')
      .eq('id', rawTrip.facility_id)
      .single();
    if (facility) trip.facility = facility;
  }
  
  // Get driver if driver_id exists
  if (rawTrip.driver_id) {
    const { data: driver } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone_number, vehicle_model, vehicle_license')
      .eq('id', rawTrip.driver_id)
      .single();
    if (driver) trip.driver = driver;
  }
  
  // Format scheduled time for display
  const formatScheduledTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    try {
      const date = new Date(timeStr);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get client information from the trip data
  const getClientInfo = (trip) => {
    if (!trip) return null;
    
    if (trip.user_profile) {
      return {
        name: trip.user_profile.full_name || `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim(),
        email: trip.user_profile.email,
        phone: trip.user_profile.phone_number,
        type: 'Individual'
      };
    }
    if (trip.managed_client) {
      return {
        name: `${trip.managed_client.first_name || ''} ${trip.managed_client.last_name || ''}`.trim(),
        email: trip.managed_client.email,
        phone: trip.managed_client.phone_number,
        type: 'Facility Client'
      };
    }
    return null;
  };

  const clientInfo = trip ? getClientInfo(trip) : null;

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Trip Details</h1>
            <Link
              href="/trips"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Trips
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">Trip not found</p>
            </div>
            <div className="flex justify-center">
              <Link
                href="/trips"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Trips
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Trip Details</h1>
          <div className="flex items-center space-x-4">
            <Link
              href="/trips"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Trips
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trip information - left column */}
          <div className="md:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Trip Information</h3>
                <span className={`px-2 py-1 text-xs rounded-full font-medium
                  ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                    trip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                    trip.status === 'upcoming' ? 'bg-indigo-100 text-indigo-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>
                  {trip.status.replace('_', ' ')}
                </span>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Trip ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{trip.id}</dd>
                  </div>
                  
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Pickup Time</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatScheduledTime(trip.pickup_time)}</dd>
                  </div>
                  
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Route</dt>
                    <dd className="mt-1 text-sm">
                      <div className="flex items-center mb-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-2"></span>
                        <span className="text-gray-900">{trip.pickup_address || 'Pickup location not specified'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="h-2 w-2 rounded-full bg-red-500 inline-block mr-2"></span>
                        <span className="text-gray-900">{trip.destination_address || 'Destination not specified'}</span>
                      </div>
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estimated Duration</dt>
                    <dd className="mt-1 text-sm text-gray-900">{trip.estimated_duration || 30} minutes</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Price</dt>
                    <dd className="mt-1 text-sm text-gray-900">${trip.price || 'N/A'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatScheduledTime(trip.created_at)}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatScheduledTime(trip.updated_at)}</dd>
                  </div>
                  
                  {trip.special_requirements && (
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Special Requirements</dt>
                      <dd className="mt-1 text-sm text-gray-900">{trip.special_requirements}</dd>
                    </div>
                  )}
                  
                  {trip.notes && (
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Notes</dt>
                      <dd className="mt-1 text-sm text-gray-900">{trip.notes}</dd>
                    </div>
                  )}
                  
                  {trip.facility && (
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Facility</dt>
                      <dd className="mt-1 text-sm">
                        <div className="text-gray-900 font-medium">{trip.facility.name}</div>
                        {trip.facility.contact_email && (
                          <div className="text-gray-600 text-xs">Email: {trip.facility.contact_email}</div>
                        )}
                        {trip.facility.phone_number && (
                          <div className="text-gray-600 text-xs">Phone: {trip.facility.phone_number}</div>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
          
          {/* Client and driver information - right column */}
          <div>
            {/* Client information */}
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Client Information</h3>
              </div>
              <div className="p-6">
                {clientInfo ? (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{clientInfo.type}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{clientInfo.name || 'N/A'}</dd>
                    </div>
                    {clientInfo.phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{clientInfo.phone}</dd>
                      </div>
                    )}
                    {clientInfo.email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">{clientInfo.email}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">Client information not available</p>
                )}
              </div>
            </div>
            
            {/* Driver information */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Driver Information</h3>
              </div>
              <div className="p-6">
                {trip.driver ? (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {trip.driver.first_name} {trip.driver.last_name}
                      </dd>
                    </div>
                    {trip.driver.phone_number && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{trip.driver.phone_number}</dd>
                      </div>
                    )}
                    {trip.driver.vehicle_model && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
                        <dd className="mt-1 text-sm text-gray-900">{trip.driver.vehicle_model}</dd>
                      </div>
                    )}
                    {trip.driver.vehicle_license && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">License Plate</dt>
                        <dd className="mt-1 text-sm text-gray-900">{trip.driver.vehicle_license}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 mb-4">No driver assigned to this trip</p>
                    <Link
                      href={`/drivers?assign_trip=${tripId}`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Assign Driver
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}