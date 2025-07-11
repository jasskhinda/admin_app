'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AddFacilityPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [facilityType, setFacilityType] = useState('Hospital');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Check auth status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      // Check if user has admin role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile || profile.role !== 'admin') {
        // Not an admin, redirect to login
        supabase.auth.signOut();
        router.push('/login?error=Access%20denied');
      }
    };
    
    checkAuth();
  }, [router, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const facilityData = {
        name,
        contact_email: contactEmail,
        phone_number: phoneNumber,
        address,
        facility_type: facilityType,
        status: 'active'
      };

      // Add billing email if provided
      if (billingEmail && billingEmail.trim()) {
        facilityData.billing_email = billingEmail;
      }
      
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .insert([facilityData])
        .select()
        .single();
        
      if (facilityError) {
        throw new Error(facilityError.message);
      }

      // Success!
      setSuccess('Facility successfully created');
      
      // Reset the form
      setName('');
      setContactEmail('');
      setBillingEmail('');
      setPhoneNumber('');
      setAddress('');
      setFacilityType('Hospital');
      
      // Redirect after a brief delay
      setTimeout(() => {
        router.push('/facilities');
      }, 1500);
      
    } catch (err) {
      console.error('Error creating facility:', err);
      setError(err.message || 'An error occurred while creating the facility');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if not authenticated yet
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Add New Facility</h1>
          <button
            onClick={() => router.push('/facilities')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Back to Facilities
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-medium mb-6">Facility Information</h2>
          
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
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Basic Information</h3>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">Facility Name *</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter facility name"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="address" className="block text-sm font-medium mb-1">Address *</label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter full address"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="facilityType" className="block text-sm font-medium mb-1">Facility Type</label>
                <select
                  id="facilityType"
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
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

            {/* Contact Information */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Contact Information</h3>
              
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">Phone Number *</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="contactEmail" className="block text-sm font-medium mb-1">Contact Email *</label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter contact email"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="billingEmail" className="block text-sm font-medium mb-1">Billing Email (Optional)</label>
                <input
                  id="billingEmail"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter billing email (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/facilities')}
                className="px-4 py-2 border border-gray-300 rounded-md mr-3 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#84CED3] text-white rounded-md hover:bg-[#70B8BD] disabled:opacity-70"
              >
                {loading ? 'Creating...' : 'Add Facility'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}