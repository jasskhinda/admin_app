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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Facility Account</h1>
          <p className="text-gray-600">Set up a new facility account with login credentials for the facility app</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <div className="text-red-700 font-medium">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
            <div className="text-green-700 font-medium">{success}</div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Facility Information</h2>
            <p className="text-sm text-gray-500 mt-1">This information will be used to create the facility account and login credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., St. Mary's Hospital"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="contact@facility.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Facility Type *
                  </label>
                  <select
                    name="facility_type"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Address *
                  </label>
                  <textarea
                    name="address"
                    required
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="123 Medical Drive, Suite 100, City, State 12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Billing Email <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    name="billing_email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="billing@facility.com"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">Login Credentials</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">
                        Login Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="login@facility.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        minLength="6"
                        className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    These credentials will be used to access the facility app
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/facilities')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Facility Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}