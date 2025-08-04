'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DatabaseCleanupView({ user, userProfile }) {
  const [loading, setLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');
    setDiagnosticData(null);
    
    try {
      const response = await fetch('/api/debug/check-orphaned-users');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run diagnostics');
      }
      
      setDiagnosticData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async (dryRun = true) => {
    setLoading(true);
    setError('');
    setCleanupResult(null);
    
    try {
      const response = await fetch('/api/admin/cleanup-orphaned-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run cleanup');
      }
      
      setCleanupResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-[#84CED3] hover:text-[#70B8BD] transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Database Cleanup Tool</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">
          <strong>Warning:</strong> This tool helps identify and clean up orphaned records in the database. 
          Always run diagnostics first and use dry run before actual cleanup.
        </p>
      </div>

      <div className="space-y-6">
        {/* Diagnostics Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Database Diagnostics</h2>
          
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-[#84CED3] text-white px-4 py-2 rounded-lg hover:bg-[#70B8BD] transition-colors disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>

          {diagnosticData && (
            <div className="mt-6 space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Auth Users:</span>
                    <span className="ml-2 font-medium">{diagnosticData.summary.total_auth_users}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Profiles:</span>
                    <span className="ml-2 font-medium">{diagnosticData.summary.total_profiles}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Managed Clients:</span>
                    <span className="ml-2 font-medium">{diagnosticData.summary.total_managed_clients}</span>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-red-600">Orphaned Auth Users:</span>
                    <span className="ml-2 font-medium text-red-600">{diagnosticData.summary.orphaned_auth_users}</span>
                  </div>
                </div>
              </div>

              {/* Users by Role */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Users by Role</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(diagnosticData.summary.users_by_role).map(([role, count]) => (
                    <div key={role}>
                      <span className="text-gray-600">{role}:</span>
                      <span className="ml-2 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orphaned Users */}
              {diagnosticData.orphaned_auth_users.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-red-800">Orphaned Auth Users (No Profile)</h3>
                  <div className="space-y-2 text-sm">
                    {diagnosticData.orphaned_auth_users.slice(0, 10).map((user) => (
                      <div key={user.id} className="flex justify-between">
                        <span>{user.email}</span>
                        <span className="text-gray-500">ID: {user.id.substring(0, 8)}...</span>
                      </div>
                    ))}
                    {diagnosticData.orphaned_auth_users.length > 10 && (
                      <p className="text-gray-600 italic">
                        ...and {diagnosticData.orphaned_auth_users.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Duplicate Emails */}
              {diagnosticData.duplicate_emails.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-yellow-800">Duplicate Emails</h3>
                  <div className="space-y-2 text-sm">
                    {diagnosticData.duplicate_emails.slice(0, 5).map((dup) => (
                      <div key={dup.email} className="border-b border-yellow-200 pb-2">
                        <p className="font-medium">{dup.email}</p>
                        <div className="ml-4 text-xs text-gray-600">
                          {dup.occurrences.map((occ, idx) => (
                            <span key={idx} className="mr-2">
                              {occ.source}: {occ.id.substring(0, 8)}...
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cleanup Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Cleanup Orphaned Users</h2>
          
          <div className="flex space-x-4">
            <button
              onClick={() => runCleanup(true)}
              disabled={loading}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Dry Run (Preview)'}
            </button>
            
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete orphaned users? This action cannot be undone.')) {
                  runCleanup(false);
                }
              }}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Delete Orphaned Users'}
            </button>
          </div>

          {cleanupResult && (
            <div className="mt-6">
              <div className={`rounded-lg p-4 ${cleanupResult.dryRun ? 'bg-blue-50' : 'bg-green-50'}`}>
                <h3 className="font-semibold mb-2">
                  {cleanupResult.dryRun ? 'Dry Run Results' : 'Cleanup Results'}
                </h3>
                <p className="mb-2">{cleanupResult.message}</p>
                
                {cleanupResult.orphanedUsers && cleanupResult.orphanedUsers.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Users that would be deleted:</p>
                    <div className="space-y-1 text-sm">
                      {cleanupResult.orphanedUsers.map((user) => (
                        <div key={user.id} className="flex justify-between">
                          <span>{user.email}</span>
                          <span className="text-gray-500">Last sign in: {user.last_sign_in_at || 'Never'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {cleanupResult.deletedUsers && cleanupResult.deletedUsers.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2 text-green-700">Successfully deleted:</p>
                    <div className="space-y-1 text-sm">
                      {cleanupResult.deletedUsers.map((user) => (
                        <div key={user.id}>{user.email}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2 text-red-700">Errors:</p>
                    <div className="space-y-1 text-sm text-red-600">
                      {cleanupResult.errors.map((err, idx) => (
                        <div key={idx}>
                          {err.email}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}
    </div>
  );
}