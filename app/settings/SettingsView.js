'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

export default function SettingsView() {
  const { user, userProfile } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Admin settings state
  const [adminSettings, setAdminSettings] = useState({
    superAdminEmail: 'j.khinda@ccgrhc.com'
  });

  const supabase = createClient();

  useEffect(() => {
    if (userProfile) {
      // Split full_name back into first_name and last_name for editing
      const fullName = userProfile.full_name || '';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setProfileData({
        first_name: userProfile.first_name || firstName,
        last_name: userProfile.last_name || lastName,
        email: user?.email || '',
        phone_number: userProfile.phone_number || '',
        address: userProfile.address || ''
      });
    }
  }, [userProfile, user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setMessage('');
    setError('');

    if (!user || !user.id) {
      setError('User not authenticated. Please refresh the page.');
      setProfileLoading(false);
      return;
    }

    try {
      console.log('Updating profile for user:', user?.id);
      console.log('Profile data:', profileData);

      // Update profile in database (full_name will be auto-generated from first_name + last_name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone_number: profileData.phone_number,
          address: profileData.address
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      console.log('Profile updated successfully');

      // Update email if changed
      if (profileData.email !== user.email) {
        console.log('Updating email from', user.email, 'to', profileData.email);
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email
        });
        
        if (emailError) {
          console.error('Email update error:', emailError);
          throw emailError;
        }
        setMessage('Profile updated successfully! Please check your email to confirm the new email address.');
      } else {
        setMessage('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Profile update failed:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setMessage('');
    setError('');

    if (!user || !user.id) {
      setError('User not authenticated. Please refresh the page.');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }

    try {
      console.log('Updating password for user:', user?.id);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      console.log('Password updated successfully');
      setMessage('Password updated successfully!');
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Password update failed:', err);
      setError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const isSuperAdmin = user?.email === adminSettings.superAdminEmail;

  // Show loading if user or userProfile is not loaded yet
  if (!user || !userProfile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84CED3]"></div>
          <span className="ml-3 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-2">Manage your admin account settings and preferences</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Current Account Overview */}
      <div className="bg-gradient-to-r from-[#84CED3] to-[#70B8BD] rounded-lg shadow-sm p-6 mb-8 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{userProfile?.full_name || 'Admin User'}</h2>
            <p className="text-white text-opacity-90">{user?.email}</p>
            <div className="flex items-center mt-2 space-x-4">
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                {userProfile?.role?.toUpperCase() || 'ADMIN'}
              </span>
              {isSuperAdmin && (
                <span className="bg-yellow-400 bg-opacity-90 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                  SUPER ADMIN
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-white text-opacity-75">
            <p className="text-sm">Member since</p>
            <p className="font-medium">
              {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <svg className="w-5 h-5 text-[#84CED3] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={`${profileData.first_name} ${profileData.last_name}`.trim()}
                onChange={(e) => {
                  const fullName = e.target.value;
                  const nameParts = fullName.trim().split(' ');
                  const firstName = nameParts[0] || '';
                  const lastName = nameParts.slice(1).join(' ') || '';
                  setProfileData({
                    ...profileData, 
                    first_name: firstName,
                    last_name: lastName
                  });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-transparent transition-colors"
                placeholder="Enter your full name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be automatically split into first and last name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-transparent transition-colors"
                placeholder="Enter your email address"
              />
              <p className="text-xs text-gray-500 mt-1">
                Changing your email will require email verification
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profileData.phone_number}
                onChange={(e) => setProfileData({...profileData, phone_number: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-transparent transition-colors"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={profileData.address}
                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-transparent transition-colors resize-none"
                placeholder="Enter your address"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full bg-[#84CED3] text-white py-3 px-6 rounded-lg hover:bg-[#70B8BD] transition-colors disabled:opacity-50 font-medium"
            >
              {profileLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </div>

        {/* Password Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <svg className="w-5 h-5 text-[#84CED3] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Security</h2>
          </div>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-transparent transition-colors"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-transparent transition-colors"
                placeholder="Confirm new password"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• At least 6 characters long</li>
                <li>• Mix of letters and numbers recommended</li>
                <li>• Avoid common passwords</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-[#84CED3] text-white py-3 px-6 rounded-lg hover:bg-[#70B8BD] transition-colors disabled:opacity-50 font-medium"
            >
              {passwordLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Account Details & Super Admin Settings */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <svg className="w-5 h-5 text-[#84CED3] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Account Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="font-medium text-gray-700">Account Type</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {userProfile?.role?.toUpperCase() || 'ADMIN'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="font-medium text-gray-700">User ID</span>
              <span className="text-gray-600 font-mono text-sm bg-gray-50 px-2 py-1 rounded">
                {user?.id?.substring(0, 8)}...
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="font-medium text-gray-700">Member Since</span>
              <span className="text-gray-600">
                {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="font-medium text-gray-700">Last Updated</span>
              <span className="text-gray-600">
                {userProfile?.updated_at ? new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'Unknown'}
              </span>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="font-medium text-gray-700">Current Email</span>
              <span className="text-gray-600 text-sm">
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Super Admin Settings - Only visible to j.khinda@ccgrhc.com */}
        {isSuperAdmin ? (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-sm border border-yellow-200 p-6">
            <div className="flex items-center mb-6">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">Super Admin</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-yellow-300">
                <h3 className="font-medium text-gray-900 mb-2">Special Privileges</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Database Cleanup Access
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    System Administration
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Full Data Access
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Security Note:</strong> Super admin privileges are hardcoded for security. 
                  Only {adminSettings.superAdminEmail} has access to sensitive operations.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-700">Standard Admin</h2>
            </div>
            
            <div className="space-y-3">
              <p className="text-gray-600 text-sm">
                You have standard administrator privileges with access to:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  User Management
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Trip Management
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Facility Management
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Reports & Analytics
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}