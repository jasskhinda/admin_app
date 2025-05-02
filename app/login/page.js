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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <Image src="/favicon.png" alt="Logo" width={40} height={40} />
            <h1 className="ml-2 text-xl font-bold text-brand-text">Compassionate Rides Admin</h1>
          </div>
        </div>
        
        {/* Error message from URL */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
            {errorMessage}
          </div>
        )}
        
        {/* Success message from URL */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded">
            {successMessage}
          </div>
        )}
        
        {/* Client-side error */}
        {clientError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
            {clientError}
          </div>
        )}
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
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
              className="flex-1 py-2 px-4 bg-brand-accent text-brand-buttonText dark:text-brand-background rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50"
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
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-700 dark:text-gray-300">
          <p>Administrator access only</p>
        </div>
      </div>
    </div>
  );
}