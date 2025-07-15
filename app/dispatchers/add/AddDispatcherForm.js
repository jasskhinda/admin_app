'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddDispatcherForm({ user, userProfile }) {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Generate a random password for the dispatcher's account
      const password = Math.random().toString(36).slice(-10) + Math.random().toString(10).slice(-2);
      
      // Prepare dispatcher profile data
      const userProfile = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      };
      
      // Call the API to create the user and profile
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          userProfile,
          role: 'dispatcher'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (result.error && result.error.includes('already has a') && !result.error.includes('dispatcher profile')) {
          throw new Error(result.error || 'Failed to create dispatcher');
        }
        
        if (result.error && !result.error.includes('already has a')) {
          throw new Error(result.error || 'Failed to create dispatcher');
        }
        
        console.log('User profile existed, but API handled it:', result);
      }

      // Success!
      setSuccess('Dispatcher account successfully created');
      
      // Reset the form
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      
      // Redirect back to dispatchers page after a short delay
      setTimeout(() => {
        router.push('/dispatchers');
      }, 1500);
      
    } catch (err) {
      console.error('Error creating dispatcher:', err);
      setError(err.message || 'An error occurred while creating the dispatcher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Add New Dispatcher</h1>
          <button
            onClick={() => router.push('/dispatchers')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Back to Dispatchers
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-medium mb-6">Dispatcher Information</h2>
          
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/dispatchers')}
                className="px-4 py-2 border border-gray-300 rounded-md mr-3 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Dispatcher'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}