'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Initialize Supabase client once outside component
const supabase = createClient();

export default function AddFacilityForm({ user, userProfile }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    contact_email: '',
    billing_email: '',
    facility_type: 'Hospital',
    password: '',
    status: 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setError('Request timed out. Please try again.');
      setLoading(false);
    }, 30000); // 30 second timeout
    
    try {
      // Validate required fields
      if (!formData.name || !formData.contact_email || !formData.address || !formData.phone_number || !formData.password) {
        setError('Facility name, contact email, address, phone number, and password are required');
        clearTimeout(timeoutId);
        setLoading(false);
        return;
      }

      console.log('Starting facility creation process...');
      console.log('User ID:', user?.id);
      console.log('Form data:', formData);
      
      // Check if supabase client is properly initialized
      if (!supabase || !supabase.from) {
        throw new Error('Supabase client not properly initialized');
      }
      
      // First, create the facility record
      const facilityData = {
        name: formData.name,
        contact_email: formData.contact_email,
        billing_email: formData.billing_email || formData.contact_email,
        phone_number: formData.phone_number,
        address: formData.address,
        facility_type: formData.facility_type,
        status: formData.status,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Creating facility with data:', facilityData);
      
      // Use API route to create facility
      const response = await fetch('/api/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(facilityData)
      });
      
      console.log('API response status:', response.status);
      
      const result = await response.json();
      console.log('API response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create facility');
      }
      
      if (!result.success || !result.facility) {
        throw new Error('Facility creation failed - no data returned');
      }
      
      console.log('Facility created successfully:', result.facility);
      
      // Set success and redirect
      setSuccess(true);
      setTimeout(() => {
        router.push('/facilities');
      }, 2000);
      
      
    } catch (err) {
      console.error('Error creating facility:', err);
      setError(err.message || 'An error occurred while creating the facility');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-center">
          <div className="text-green-600 text-lg font-semibold mb-2">
            Facility Created Successfully!
          </div>
          <div className="text-green-600 mb-4">
            Redirecting to facilities list...
          </div>
          <Link
            href="/facilities"
            className="text-primary hover:text-primary-dark underline"
          >
            Go to Facilities List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
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
                value={formData.name}
                onChange={handleInputChange}
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
                value={formData.address}
                onChange={handleInputChange}
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
                value={formData.phone_number}
                onChange={handleInputChange}
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
                value={formData.contact_email}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter contact email address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Billing Email
              </label>
              <input
                type="email"
                name="billing_email"
                value={formData.billing_email}
                onChange={handleInputChange}
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
                value={formData.facility_type}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
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
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
                placeholder="Enter password for facility login"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href="/facilities"
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
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
    </div>
  );
}