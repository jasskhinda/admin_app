'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditDispatcherForm({ user, userProfile, dispatcher }) {
  const router = useRouter();
  
  const [firstName, setFirstName] = useState(dispatcher.first_name || '');
  const [lastName, setLastName] = useState(dispatcher.last_name || '');
  const [email, setEmail] = useState(dispatcher.email || '');
  const [phoneNumber, setPhoneNumber] = useState(dispatcher.phone_number || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatePassword, setUpdatePassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate password if updating
      if (updatePassword) {
        if (!newPassword || newPassword.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        
        if (newPassword !== confirmNewPassword) {
          throw new Error('Passwords do not match');
        }
      }

      const requestBody = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber,
      };

      // Include password if updating
      if (updatePassword) {
        requestBody.password = newPassword;
      }

      const response = await fetch(`/api/dispatchers/${dispatcher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update dispatcher');
      }

      setSuccess('Dispatcher updated successfully!');
      setTimeout(() => {
        router.push(`/dispatchers/${dispatcher.id}`);
      }, 1500);

    } catch (err) {
      console.error('Error updating dispatcher:', err);
      setError(err.message || 'An error occurred while updating the dispatcher');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this dispatcher? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/dispatchers/${dispatcher.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete dispatcher');
      }

      router.push('/dispatchers?message=Dispatcher%20deleted%20successfully');

    } catch (err) {
      console.error('Error deleting dispatcher:', err);
      setError(err.message || 'An error occurred while deleting the dispatcher');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/dispatchers/${dispatcher.id}`)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dispatcher Details
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Edit Dispatcher</h1>
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
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
            </div>

            {/* Password Update Section */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium">Password Update</h3>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={updatePassword}
                    onChange={(e) => {
                      setUpdatePassword(e.target.checked);
                      if (!e.target.checked) {
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">Update password</span>
                </label>
              </div>
              
              {updatePassword && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium mb-1">New Password</label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required={updatePassword}
                      minLength="8"
                      placeholder="Minimum 8 characters"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-sm font-medium mb-1">Confirm New Password</label>
                    <input
                      id="confirmNewPassword"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required={updatePassword}
                      minLength="8"
                      placeholder="Re-enter new password"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    />
                  </div>
                </div>
              )}
              
              <div className="mt-2 text-sm text-gray-600">
                <p>• Password must be at least 8 characters long</p>
                <p>• This will update the dispatcher's login credentials for the dispatcher app</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Dispatcher'}
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => router.push(`/dispatchers/${dispatcher.id}`)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
    </main>
  );
}