'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

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
    const facilityData = {
      name: formData.get('name'),
      contact_email: formData.get('contact_email'),
      phone_number: formData.get('phone_number'),
      address: formData.get('address'),
      facility_type: formData.get('facility_type'),
      status: 'active'
    };

    // Add billing email if provided
    const billingEmail = formData.get('billing_email');
    if (billingEmail && billingEmail.trim()) {
      facilityData.billing_email = billingEmail;
    }

    try {
      const supabase = createClient();
      
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .insert([facilityData])
        .select()
        .single();
        
      if (facilityError) {
        throw new Error(facilityError.message);
      }

      setSuccess('Facility successfully created!');
      
      // Redirect after brief delay
      setTimeout(() => {
        router.push('/facilities');
      }, 1500);
      
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