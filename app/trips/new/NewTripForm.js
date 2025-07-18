'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { loadGoogleMaps } from '@/lib/google-maps-loader';
import { calculatePrice } from '@/lib/pricing';
import GoogleMapsAutocomplete from '@/components/GoogleMapsAutocomplete';

export default function NewTripForm({ 
  user, 
  userProfile, 
  individualClients = [], 
  managedClients = [], 
  facilities = [],
  drivers = [], 
  preselectedDriverId 
}) {
  const router = useRouter();
  const supabase = createClient();
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientType, setSelectedClientType] = useState(''); // 'individual' or 'managed'
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnTime, setReturnTime] = useState('');
  const [wheelchairType, setWheelchairType] = useState('none');
  const [provideWheelchair, setProvideWheelchair] = useState(false);
  const [wheelchairRequirements, setWheelchairRequirements] = useState('');
  const [additionalPassengers, setAdditionalPassengers] = useState(0);
  const [isEmergency, setIsEmergency] = useState(false);
  const [notes, setNotes] = useState('');
  const [driverId, setDriverId] = useState(preselectedDriverId || '');
  
  // Pricing state
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [priceDetails, setPriceDetails] = useState(null);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setGoogleMapsLoaded(true))
      .catch(err => console.error('Failed to load Google Maps:', err));
  }, []);

  // Group clients by type for display
  const groupedClients = {
    individual: individualClients,
    managed: managedClients.reduce((acc, client) => {
      const facilityName = client.facility?.name || 'Unknown Facility';
      if (!acc[facilityName]) {
        acc[facilityName] = [];
      }
      acc[facilityName].push(client);
      return acc;
    }, {})
  };

  // Find selected client details
  const selectedClient = selectedClientType === 'individual' 
    ? individualClients.find(c => c.id === selectedClientId)
    : managedClients.find(c => c.id === selectedClientId);

  // Calculate price when relevant fields change
  useEffect(() => {
    if (pickupAddress && destinationAddress) {
      calculateTripPrice();
    }
  }, [
    pickupAddress, 
    destinationAddress, 
    isRoundTrip, 
    pickupDate, 
    pickupTime, 
    wheelchairType, 
    provideWheelchair, 
    additionalPassengers,
    isEmergency
  ]);

  const calculateTripPrice = useCallback(async () => {
    if (!pickupAddress || !destinationAddress) return;
    
    setCalculatingPrice(true);
    try {
      const result = await calculatePrice({
        origin: pickupAddress,
        destination: destinationAddress,
        isRoundTrip,
        pickupDate,
        pickupTime,
        wheelchairType,
        provideWheelchair,
        additionalPassengers,
        isEmergency
      });
      
      setPriceDetails(result);
      setDistance(result.distance);
      setDuration(result.duration);
    } catch (error) {
      console.error('Error calculating price:', error);
      setPriceDetails({
        totalPrice: 0,
        breakdown: { error: 'Unable to calculate price' }
      });
    } finally {
      setCalculatingPrice(false);
    }
  }, [pickupAddress, destinationAddress, isRoundTrip, pickupDate, pickupTime, wheelchairType, provideWheelchair, additionalPassengers, isEmergency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedClientId || !selectedClientType) {
        throw new Error('Please select a client');
      }

      // Validate transport wheelchair restriction
      if (wheelchairType === 'transport') {
        throw new Error('Transport wheelchairs are not currently supported. Please select a different option.');
      }

      // Prepare trip data
      const tripData = {
        pickup_address: pickupAddress,
        destination_address: destinationAddress,
        pickup_time: `${pickupDate}T${pickupTime}:00`,
        status: driverId ? 'upcoming' : 'pending',
        driver_id: driverId || null,
        wheelchair_type: wheelchairType !== 'none' ? wheelchairType : null,
        additional_passengers: additionalPassengers,
        notes: notes || null,
        is_round_trip: isRoundTrip,
        return_pickup_time: isRoundTrip && returnTime ? `${pickupDate}T${returnTime}:00` : null,
        price: priceDetails?.totalPrice || 0,
        distance: distance || 0,
        duration: duration || 0,
        created_by: user.id,
        created_by_role: userProfile.role,
        provide_wheelchair: provideWheelchair,
        wheelchair_requirements: provideWheelchair ? wheelchairRequirements : null,
        is_emergency: isEmergency
      };

      // Set client-specific fields
      if (selectedClientType === 'individual') {
        tripData.user_id = selectedClientId;
      } else {
        tripData.managed_client_id = selectedClientId;
        // Find the facility ID for this managed client
        const managedClient = managedClients.find(c => c.id === selectedClientId);
        if (managedClient?.facility_id) {
          tripData.facility_id = managedClient.facility_id;
        }
      }

      // Create the trip
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert([tripData])
        .select()
        .single();

      if (tripError) throw tripError;

      setSuccess('Trip created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/trips');
      }, 1500);

    } catch (err) {
      console.error('Error creating trip:', err);
      setError(err.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Trip</h1>
        <p className="mt-2 text-sm text-gray-600">
          Schedule a new transportation trip for a client
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
          <p className="font-semibold">❌ {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 border-l-4 border-green-500 bg-green-50 text-green-700 rounded">
          <p className="font-semibold">✅ {success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Client Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client <span className="text-red-500">*</span>
            </label>
            <select
              value={`${selectedClientType}:${selectedClientId}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split(':');
                setSelectedClientType(type);
                setSelectedClientId(id);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value=":">Select a client</option>
              
              {/* Individual Clients */}
              {groupedClients.individual.length > 0 && (
                <optgroup label="📋 Individual Clients">
                  {groupedClients.individual.map(client => (
                    <option key={client.id} value={`individual:${client.id}`}>
                      {client.full_name || `${client.first_name} ${client.last_name}`} - {client.email}
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* Facility Clients */}
              {Object.entries(groupedClients.managed).map(([facilityName, clients]) => (
                <optgroup key={facilityName} label={`🏢 ${facilityName}`}>
                  {clients.map(client => (
                    <option key={client.id} value={`managed:${client.id}`}>
                      👤 {client.first_name} {client.last_name} - {client.email || client.phone_number || 'No contact'}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Show client details if selected */}
          {selectedClient && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Phone:</strong> {selectedClient.phone_number || 'Not provided'}
              </p>
              {selectedClient.medical_notes && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Medical Notes:</strong> {selectedClient.medical_notes}
                </p>
              )}
              {selectedClient.accessibility_needs && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Accessibility Needs:</strong> {selectedClient.accessibility_needs}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Trip Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Address <span className="text-red-500">*</span>
              </label>
              {googleMapsLoaded ? (
                <GoogleMapsAutocomplete
                  value={pickupAddress}
                  onChange={setPickupAddress}
                  placeholder="Enter pickup address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              ) : (
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Enter pickup address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Address <span className="text-red-500">*</span>
              </label>
              {googleMapsLoaded ? (
                <GoogleMapsAutocomplete
                  value={destinationAddress}
                  onChange={setDestinationAddress}
                  placeholder="Enter destination address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              ) : (
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Enter destination address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
            </div>
          </div>

          {/* Round Trip */}
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Round Trip</span>
            </label>
            
            {isRoundTrip && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={isRoundTrip}
                />
              </div>
            )}
          </div>

          {/* Emergency Trip */}
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">Emergency Trip</span>
              <span className="text-xs text-gray-500 ml-2">(+$40 fee)</span>
            </label>
          </div>
        </div>

        {/* Accessibility Options */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Accessibility Options</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wheelchair Type
            </label>
            <select
              value={wheelchairType}
              onChange={(e) => setWheelchairType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">None</option>
              <option value="manual">Manual Wheelchair</option>
              <option value="power">Power Wheelchair</option>
              <option value="transport" disabled>Transport Wheelchair (Not Available)</option>
            </select>
          </div>

          {wheelchairType !== 'none' && (
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={provideWheelchair}
                  onChange={(e) => setProvideWheelchair(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Provide wheelchair (+$25 rental fee)
                </span>
              </label>
              
              {provideWheelchair && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wheelchair Requirements
                  </label>
                  <textarea
                    value={wheelchairRequirements}
                    onChange={(e) => setWheelchairRequirements(e.target.value)}
                    rows={2}
                    placeholder="Specify any special wheelchair requirements..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Passengers
            </label>
            <input
              type="number"
              min="0"
              max="3"
              value={additionalPassengers}
              onChange={(e) => setAdditionalPassengers(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Driver Assignment */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Driver Assignment</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Driver (Optional)
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No driver assigned</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name || `${driver.first_name} ${driver.last_name}`} - {driver.status || 'Unknown status'}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any special instructions or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Pricing */}
        {priceDetails && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Trip Pricing</h2>
              <button
                type="button"
                onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showPriceBreakdown ? 'Hide' : 'Show'} Breakdown
              </button>
            </div>
            
            <div className="text-3xl font-bold text-gray-900">
              ${priceDetails.totalPrice.toFixed(2)}
              {priceDetails.isEstimate && (
                <span className="text-sm font-normal text-gray-500 ml-2">(Estimated)</span>
              )}
            </div>
            
            {showPriceBreakdown && priceDetails.breakdown && (
              <div className="mt-4 space-y-2 text-sm">
                {Object.entries(priceDetails.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-900 font-medium">${value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {distance && duration && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-gray-600">
                  <strong>Distance:</strong> {distance.toFixed(1)} miles | 
                  <strong className="ml-2">Duration:</strong> {Math.ceil(duration)} minutes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/trips')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || calculatingPrice}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Trip...' : 'Create Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}