'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddFacilityForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const facilityName = formData.get('name');
    const contactEmail = formData.get('contact_email');
    const billingEmail = formData.get('billing_email');
    const phoneNumber = formData.get('phone_number');
    const address = formData.get('address');
    const facilityType = formData.get('facility_type');

    try {
      // Step 1: Create the facility record first
      const facilityData = {
        name: facilityName,
        contact_email: contactEmail,
        phone_number: phoneNumber,
        address: address,
        facility_type: facilityType,
        status: 'active'
      };

      // Add billing email if provided
      if (billingEmail && billingEmail.trim()) {
        facilityData.billing_email = billingEmail;
      }

      const facilityResponse = await fetch('/api/create-facility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facilityData)
      });

      if (!facilityResponse.ok) {
        const facilityError = await facilityResponse.json();
        throw new Error(facilityError.error || 'Failed to create facility record');
      }

      const { facility } = await facilityResponse.json();

      // Step 2: Create the user account for the facility
      const userProfile = {
        first_name: facilityName,
        last_name: 'Facility',
        phone_number: phoneNumber,
        address: address,
        facility_id: facility.id,
        status: 'active'
      };

      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          userProfile: userProfile,
          role: 'facility'
        })
      });

      if (!userResponse.ok) {
        const userError = await userResponse.json();
        throw new Error(userError.error || 'Failed to create facility user account');
      }

      setSuccess('Facility and user account successfully created!');
      
      // Redirect after brief delay
      setTimeout(() => {
        router.push('/facilities');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating facility:', err);
      setError(err.message || 'Failed to create facility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Add New Facility</h1>
        <p className="text-gray-600">Create a new facility in the system</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600">{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Facility Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Facility Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter facility name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Address *
              </label>
              <input
                type="text"
                name="address"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter full address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone_number"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                name="contact_email"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter contact email address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Billing Email (Optional)
              </label>
              <input
                type="email"
                name="billing_email"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter billing email (optional)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Facility Type
              </label>
              <select
                name="facility_type"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                defaultValue="Hospital"
              >
                <option value="Hospital">Hospital</option>
                <option value="Clinic">Clinic</option>
                <option value="Nursing Home">Nursing Home</option>
                <option value="Assisted Living">Assisted Living</option>
                <option value="Rehabilitation Center">Rehabilitation Center</option>
                <option value="Medical Center">Medical Center</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Login Account Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Login Account Information</h2>
          <p className="text-sm text-gray-600 mb-4">This will create a user account that the facility can use to log into the facility app.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Login Email *
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter login email address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                required
                minLength="6"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter password (minimum 6 characters)"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/facilities')}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#84CED3] text-white rounded hover:bg-[#70B8BD] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Add Facility'}
          </button>
        </div>
      </form>
    </div>
  );
}