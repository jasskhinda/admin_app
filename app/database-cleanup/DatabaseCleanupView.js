'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DatabaseCleanupView({ user, userProfile }) {
  const [loading, setLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [advancedCleanupResult, setAdvancedCleanupResult] = useState(null);
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

  const runAdvancedCleanup = async (options = {}) => {
    setLoading(true);
    setError('');
    setAdvancedCleanupResult(null);
    
    try {
      const response = await fetch('/api/admin/cleanup-orphaned-users-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run advanced cleanup');
      }
      
      setAdvancedCleanupResult(data);
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

        {/* Basic Cleanup Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Cleanup (Users Without Trips)</h2>
          
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
                if (window.confirm('Are you sure you want to delete orphaned users without trips? This action cannot be undone.')) {
                  runCleanup(false);
                }
              }}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Delete Users (No Trips Only)'}
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

        {/* Advanced Cleanup Section */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-800">Advanced Cleanup (Users With Trips)</h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              <strong>⚠️ Warning:</strong> These options will handle users who have associated trips. 
              Use with extreme caution and always run dry run first.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => runAdvancedCleanup({ dryRun: true, deleteTrips: false, archiveTrips: false })}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Advanced Dry Run'}
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Archive trips and delete users? Trips will be marked as archived but preserved.')) {
                    runAdvancedCleanup({ dryRun: false, deleteTrips: false, archiveTrips: true });
                  }
                }}
                disabled={loading}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Archive Trips & Delete Users'}
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('⚠️ DANGER: This will permanently delete users AND their trips. Are you absolutely sure?')) {
                    if (window.confirm('Final confirmation: This will DELETE TRIPS permanently. Continue?')) {
                      runAdvancedCleanup({ dryRun: false, deleteTrips: true, archiveTrips: false });
                    }
                  }
                }}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Running...' : '🗑️ DELETE ALL (DANGER)'}
              </button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Advanced Dry Run:</strong> Preview what would happen to users with trips</p>
              <p><strong>Archive Trips:</strong> Mark trips as archived, then delete users (recommended)</p>
              <p><strong>DELETE ALL:</strong> Permanently delete users and all their trips (irreversible)</p>
            </div>
          </div>

          {advancedCleanupResult && (
            <div className="mt-6 space-y-6">
              <div className={`rounded-lg p-4 ${advancedCleanupResult.dryRun ? 'bg-blue-50' : 'bg-green-50'}`}>
                <h3 className="font-semibold mb-2">
                  {advancedCleanupResult.dryRun ? 'Advanced Analysis Results' : 'Advanced Cleanup Results'}
                </h3>
                <p className="mb-4">{advancedCleanupResult.message}</p>
              </div>

              {/* Users Requiring Dispatcher Review - HIGH PRIORITY */}
              {advancedCleanupResult.usersRequiringDispatcherReview && advancedCleanupResult.usersRequiringDispatcherReview.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                    ⚠️ DISPATCHER REVIEW REQUIRED ({advancedCleanupResult.usersRequiringDispatcherReview.length} users)
                  </h4>
                  <p className="text-red-700 text-sm mb-4">
                    These users have pending or upcoming trips. Please contact your dispatchers to complete or cancel these trips before deletion.
                  </p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {advancedCleanupResult.usersRequiringDispatcherReview.map((user, idx) => (
                      <div key={idx} className="bg-white border border-red-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900">{user.displayName}</h5>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-sm text-gray-600">Phone: {user.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                              {user.pendingTripsCount} Pending
                            </span>
                            {user.upcomingTripsCount > 0 && (
                              <span className="inline-block ml-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                                {user.upcomingTripsCount} Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Show trip details */}
                        {user.pendingTripDetails && user.pendingTripDetails.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded border">
                            <p className="text-xs font-medium text-gray-700 mb-2">Pending Trips:</p>
                            {user.pendingTripDetails.slice(0, 3).map((trip, tripIdx) => (
                              <div key={tripIdx} className="text-xs text-gray-600 mb-1">
                                • <strong>{trip.status.toUpperCase()}</strong> - {trip.pickup} → {trip.destination}
                                {trip.pickup_time && <span className="ml-1">({new Date(trip.pickup_time).toLocaleDateString()})</span>}
                              </div>
                            ))}
                            {user.pendingTripDetails.length > 3 && (
                              <p className="text-xs text-gray-500 italic">...and {user.pendingTripDetails.length - 3} more trips</p>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs text-yellow-800">
                            <strong>Action Required:</strong> Contact dispatchers to complete/cancel active trips before this user can be deleted.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe Deletion Users */}
              {advancedCleanupResult.safeDeletionUsers && advancedCleanupResult.safeDeletionUsers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3">
                    ✅ Safe for Deletion ({advancedCleanupResult.safeDeletionUsers.length} users)
                  </h4>
                  <p className="text-green-700 text-sm mb-4">
                    These users only have completed or no trips and can be safely deleted.
                  </p>
                  <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
                    {advancedCleanupResult.safeDeletionUsers.map((user, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white rounded border">
                        <div>
                          <span className="font-medium">{user.displayName}</span>
                          <span className="text-gray-500 ml-2">({user.email})</span>
                          <div className="text-xs text-gray-500">
                            {user.completedTripsCount} completed trips • Phone: {user.phone}
                          </div>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Safe to delete
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {advancedCleanupResult.dryRun && advancedCleanupResult.safeDeletionUsers.length > 0 && (
                    <div className="mt-4 p-3 bg-white border border-green-200 rounded">
                      <p className="text-sm text-green-800 mb-3">
                        <strong>Ready for cleanup:</strong> {advancedCleanupResult.safeDeletionUsers.length} users can be safely deleted.
                      </p>
                      <button
                        onClick={() => {
                          if (window.confirm(`Archive completed trips and delete ${advancedCleanupResult.safeDeletionUsers.length} safe users?`)) {
                            runAdvancedCleanup({ 
                              dryRun: false, 
                              deleteTrips: false, 
                              archiveTrips: true,
                              selectedUsers: advancedCleanupResult.safeDeletionUsers.map(u => u.id)
                            });
                          }
                        }}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : 'Clean Up Safe Users'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Errors Section */}
              {advancedCleanupResult.errors && advancedCleanupResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-3">Errors Encountered:</h4>
                  <div className="space-y-1 text-sm text-red-600">
                    {advancedCleanupResult.errors.map((err, idx) => (
                      <div key={idx} className="p-2 bg-white border border-red-200 rounded">
                        <strong>{err.email}:</strong> {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary for completed cleanups */}
              {!advancedCleanupResult.dryRun && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">Cleanup Summary:</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-white rounded border">
                      <div className="text-2xl font-bold text-green-600">{advancedCleanupResult.usersDeleted}</div>
                      <div className="text-xs text-gray-600">Users Deleted</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded border">
                      <div className="text-2xl font-bold text-orange-600">{advancedCleanupResult.tripsArchived}</div>
                      <div className="text-xs text-gray-600">Trips Archived</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded border">
                      <div className="text-2xl font-bold text-red-600">{advancedCleanupResult.tripsDeleted}</div>
                      <div className="text-xs text-gray-600">Trips Deleted</div>
                    </div>
                  </div>
                </div>
              )}
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