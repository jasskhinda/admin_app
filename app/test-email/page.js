'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendTestEmail = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverEmail: email }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Test Driver Email Notification</h1>
        
        <form onSubmit={sendTestEmail} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Driver Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5fbfc0]"
              placeholder="driver@example.com"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[#5fbfc0] text-white rounded-md hover:bg-[#4aa5a6] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Test Email'}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-md ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-semibold ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.success ? '✅ Success' : '❌ Error'}
            </h3>
            <p className={`mt-2 text-sm ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.success ? result.message : result.error}
            </p>
            {result.messageId && (
              <p className="mt-1 text-xs text-green-600">
                Message ID: {result.messageId}
              </p>
            )}
            {result.details && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer">Error Details</summary>
                <pre className="mt-1 text-xs text-red-600 whitespace-pre-wrap">{result.details}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}