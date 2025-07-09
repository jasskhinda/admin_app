'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { login, signup } from './actions';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState('');
  const searchParams = useSearchParams();
  
  // Check for error message or success message in URL
  const errorMessage = searchParams.get('error');
  const successMessage = searchParams.get('message');
  
  async function handleFormAction(formData, action) {
    setLoading(true);
    setClientError('');
    
    try {
      const result = await action(formData);
      if (result?.error) {
        setClientError(result.error);
      }
      // If no error, the action will redirect
    } catch (error) {
      setClientError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-3">
            <Image src="/LOGO2 (1).webp" alt="Logo" width={60} height={60} />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Compassionate Care Transportation</h1>
              <div className="bg-[#84CED3] text-white px-3 py-1 rounded-lg text-sm font-medium inline-block">
                Admin
              </div>
            </div>
          </div>
        </div>
        
        {/* Error message from URL */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {errorMessage}
          </div>
        )}
        
        {/* Success message from URL */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        
        {/* Client-side error */}
        {clientError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {clientError}
          </div>
        )}
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#84CED3] focus:border-[#84CED3]"
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                const form = e.currentTarget.closest('form');
                await handleFormAction(new FormData(form), login);
              }}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-[#84CED3] text-white rounded hover:bg-[#70B8BD] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#84CED3] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
            
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                const form = e.currentTarget.closest('form');
                await handleFormAction(new FormData(form), signup);
              }}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Administrator access only</p>
        </div>
      </div>
    </div>
  );
}