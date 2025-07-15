'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function TripDetails({ params }) {
  const tripId = params.id;
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  // State variables
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Ensure user has admin or dispatcher role
    if (!userProfile || !['admin', 'dispatcher'].includes(userProfile.role)) {
      signOut();
      router.push('/login?error=Access denied. Admin or dispatcher access required.');
      return;
    }
    
    fetchTripDetails();
  }, [user, userProfile, router, signOut, tripId]);
  
  // Fetch trip details
  const fetchTripDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First, get basic trip data
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
        
      if (tripError) throw tripError;
      
      if (!tripData) {
        setError('Trip not found');
        return;
      }
      
      // Enrich with client and driver information
      let enrichedTrip = { ...tripData };
      
      // Get client information
      if (tripData.user_id) {
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, email, phone_number')
          .eq('id', tripData.user_id)
          .single();
        
        if (clientProfile) {
          enrichedTrip.client = clientProfile;
        }
      } else if (tripData.managed_client_id) {
        const { data: managedClient } = await supabase
          .from('facility_managed_clients')
          .select('id, first_name, last_name, email, phone_number')
          .eq('id', tripData.managed_client_id)
          .single();
        
        if (managedClient) {
          enrichedTrip.client = managedClient;
        }
      }
      
      // Get driver information
      if (tripData.driver_id) {
        const { data: driverProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone_number')
          .eq('id', tripData.driver_id)
          .single();
        
        if (driverProfile) {
          enrichedTrip.driver = driverProfile;
        }
      }
      
      // Get facility information
      if (tripData.facility_id) {
        const { data: facilityData } = await supabase
          .from('facilities')
          .select('id, name, contact_email, contact_phone')
          .eq('id', tripData.facility_id)
          .single();
        
        if (facilityData) {
          enrichedTrip.facility = facilityData;
        }
      }
      
      setTrip(enrichedTrip);
    } catch (error) {
      console.error('Error fetching trip details:', error);
      setError('Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };
  
  // Format scheduled time for display
  const formatScheduledTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Trip Details</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/trips')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Trips
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/calendar')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Calendar
              </button>
            </div>
          </div>
        ) : trip && (
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
                      <dt className="text-sm font-medium text-gray-500">Created At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatScheduledTime(trip.created_at)}</dd>
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
                          {trip.facility.contact_phone && (
                            <div className="text-gray-600 text-xs">Phone: {trip.facility.contact_phone}</div>
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
                  {trip.client ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {trip.client.first_name} {trip.client.last_name}
                        </dd>
                      </div>
                      {trip.client.phone_number && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900">{trip.client.phone_number}</dd>
                        </div>
                      )}
                      {trip.client.email && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">{trip.client.email}</dd>
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
                      {trip.driver.driver_details?.vehicle_info && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
                          <dd className="mt-1 text-sm text-gray-900">{trip.driver.driver_details.vehicle_info}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-4">No driver assigned to this trip</p>
                      <button
                        onClick={() => router.push(`/drivers?assign_trip=${tripId}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Assign Driver
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}