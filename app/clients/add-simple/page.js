'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AddClientSimple() {
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isVeteran, setIsVeteran] = useState(false);
  const [clientType, setClientType] = useState('individual');
  const [facilityId, setFacilityId] = useState('');
  const [facilities, setFacilities] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Simple auth check - if middleware let us through, we're good
  useEffect(() => {
    const initPage = async () => {
      try {
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
        
        // Load facilities
        try {
          const { data, error } = await supabase
            .from('facilities')
            .select('id, name')
            .order('name');
          
          if (!error && data) {
            setFacilities(data);
          }
        } catch (err) {
          console.log('Could not load facilities:', err);
        }
        
        setPageLoaded(true);
      } catch (err) {
        console.error('Error initializing page:', err);
        setPageLoaded(true); // Show page anyway
      }
    };

    initPage();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (clientType === 'facility') {
        if (!facilityId) {
          throw new Error('Please select a facility for facility clients');
        }

        const response = await fetch('/api/facility-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility_id: facilityId,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            address,
            notes,
            metadata: { veteran: isVeteran }
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create facility client');
        }
        setSuccess('Facility client successfully created');
      } else {
        const clientPassword = password || Math.random().toString(36).slice(-10) + Math.random().toString(10).slice(-2);
        
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: clientPassword,
            userProfile: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              address,
              notes,
              metadata: { veteran: isVeteran }
            },
            role: 'client'
          }),
        });
        
        const result = await response.json();
        if (!response.ok) {
          if (result.error && result.error.includes('Server configuration error')) {
            throw new Error('The server is not properly configured. Please ensure SUPABASE_SERVICE_ROLE_KEY is set.');
          }
          if (result.error && !result.error.includes('already has a')) {
            throw new Error(result.error || 'Failed to create client');
          }
        }
        setSuccess(`Individual client account successfully created. ${password ? 'Login credentials: ' + email + ' / ' + password : 'Login credentials will be sent separately.'}`);
      }
      
      // Reset form
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setAddress('');
      setNotes('');
      setIsVeteran(false);
      setClientType('individual');
      setFacilityId('');
      
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err.message || 'An error occurred while creating the client');
    } finally {
      setLoading(false);
    }
  };

  if (!pageLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Add New Client</h1>
          <button
            onClick={() => router.push('/clients')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Back to Clients
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-medium mb-6">Client Information</h2>
          
          {error && (
            <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border-l-4 border-green-500 bg-green-50 text-green-700 rounded">
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Type Selection */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Client Type</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-md hover:bg-gray-100">
                  <input
                    type="radio"
                    name="clientType"
                    value="individual"
                    checked={clientType === 'individual'}
                    onChange={(e) => setClientType(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium">Individual Client</div>
                    <div className="text-sm text-gray-600">Creates a user account with login access</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-md hover:bg-gray-100">
                  <input
                    type="radio"
                    name="clientType"
                    value="facility"
                    checked={clientType === 'facility'}
                    onChange={(e) => setClientType(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium">Facility Client</div>
                    <div className="text-sm text-gray-600">Managed by a healthcare facility</div>
                  </div>
                </label>
              </div>

              {clientType === 'facility' && (
                <div className="mt-4">
                  <label htmlFor="facilityId" className="block text-sm font-medium mb-1">Select Facility</label>
                  <select
                    id="facilityId"
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    required={clientType === 'facility'}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">Select a facility...</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Personal Information */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  />
                </div>
              </div>

              {clientType === 'individual' && (
                <>
                  <div className="mt-4">
                    <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required={clientType === 'individual'}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    />
                    <p className="text-xs text-gray-600 mt-1">Used for login access and notifications</p>
                  </div>
                  
                  <div className="mt-4">
                    <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave empty to auto-generate"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Client will use this to login to the booking app. Leave empty to auto-generate a secure password.
                    </p>
                  </div>
                </>
              )}

              <div className="mt-4">
                <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Additional Information</h3>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Special needs, preferences, etc."
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
              
              <div className="mt-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVeteran}
                    onChange={(e) => setIsVeteran(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Veteran (eligible for 20% discount)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/clients')}
                className="px-4 py-2 border border-gray-300 rounded-md mr-3 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                {loading ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}