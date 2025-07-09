'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AddFacilityForm({ user, userProfile }) {
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    contact_person: '',
    notes: '',
    status: 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
    
    try {
      // Validate required fields
      if (!formData.name || !formData.contact_email) {
        setError('Facility name and contact email are required');
        setLoading(false);
        return;
      }

      // Insert facility
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .insert([{
          name: formData.name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          contact_person: formData.contact_person,
          notes: formData.notes,
          status: formData.status,
          created_by: user.id
        }])
        .select()
        .single();

      if (facilityError) {
        throw facilityError;
      }

      console.log('Facility created successfully:', facility);
      setSuccess(true);
      
      // Redirect to facilities list after short delay
      setTimeout(() => {
        router.push('/facilities');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating facility:', err);
      setError(err.message || 'An error occurred while creating the facility');
    } finally {
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
        <div className="bg-surface p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                placeholder="Enter facility name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Person
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                placeholder="Enter contact person name"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                placeholder="Enter phone number"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Location</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                placeholder="Enter street address"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                  placeholder="Enter state"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="4"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                placeholder="Enter any additional notes about the facility"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href="/facilities"
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-onPrimary rounded hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Facility'}
          </button>
        </div>
      </form>
    </div>
  );
}