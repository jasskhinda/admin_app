'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditDriverForm({ driver, user, userProfile }) {
  const router = useRouter();
  
  const [email, setEmail] = useState(driver.email || '');
  const [firstName, setFirstName] = useState(driver.first_name || '');
  const [lastName, setLastName] = useState(driver.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(driver.phone_number || '');
  const [vehicleModel, setVehicleModel] = useState(driver.vehicle_model || '');
  const [vehicleLicense, setVehicleLicense] = useState(driver.vehicle_license || '');
  const [status, setStatus] = useState(driver.status || 'available');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Call the API to update the driver
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          vehicle_model: vehicleModel,
          vehicle_license: vehicleLicense,
          status: status,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update driver');
      }

      setSuccess('Driver information updated successfully');
      
      // Redirect back to drivers page after a short delay
      setTimeout(() => {
        router.push('/drivers');
      }, 1500);
      
    } catch (err) {
      console.error('Error updating driver:', err);
      setError(err.message || 'An error occurred while updating the driver');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete driver');
      }

      router.push('/drivers?success=Driver%20deleted%20successfully');
      
    } catch (err) {
      console.error('Error deleting driver:', err);
      setError(err.message || 'An error occurred while deleting the driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Edit Driver</h1>
          <button
            onClick={() => router.push('/drivers')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Back to Drivers
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">Driver Information</h2>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Delete Driver
            </button>
          </div>
          
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

              <div className="mt-4">
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                />
              </div>

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

            {/* Vehicle Information */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Vehicle Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vehicleModel" className="block text-sm font-medium mb-1">Vehicle Model</label>
                  <input
                    id="vehicleModel"
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Make, Model, Year"
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="vehicleLicense" className="block text-sm font-medium mb-1">License Plate</label>
                  <input
                    id="vehicleLicense"
                    type="text"
                    value={vehicleLicense}
                    onChange={(e) => setVehicleLicense(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="available">Available</option>
                  <option value="offline">Offline</option>
                  <option value="on_trip">On Trip</option>
                </select>
              </div>
            </div>

            {/* Driver Details */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Driver Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="block text-sm font-medium text-gray-700">Driver ID:</span>
                  <span className="text-sm text-gray-600">{driver.id}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">Account Created:</span>
                  <span className="text-sm text-gray-600">
                    {new Date(driver.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/drivers')}
                className="px-4 py-2 border border-gray-300 rounded-md mr-3 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Driver'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}