'use client';

import { useRouter } from 'next/navigation';

export default function ClientDetailView({ client, stats }) {
  const router = useRouter();
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {client.first_name || 'Unknown'} {client.last_name || 'Client'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Client ID: {client.id}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">First Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.first_name || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.last_name || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.email || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.phone_number || 'Not provided'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.address || 'Not provided'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Medical & Accessibility Information */}
            {(client.accessibility_needs || client.medical_requirements || client.emergency_contact) && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Special Requirements</h2>
                </div>
                <div className="p-6 space-y-4">
                  {client.accessibility_needs && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Accessibility Needs</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.accessibility_needs}</dd>
                    </div>
                  )}
                  {client.medical_requirements && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Medical Requirements</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.medical_requirements}</dd>
                    </div>
                  )}
                  {client.emergency_contact && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.emergency_contact}</dd>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Trips */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Trips</h2>
              </div>
              <div className="p-6">
                {stats.recentTrips.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No trips found</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recentTrips.map((trip) => (
                      <div key={trip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {trip.pickup_address} → {trip.destination_address}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(trip.pickup_datetime)} at {formatTime(trip.pickup_datetime)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          trip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {trip.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Status</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    client.status === 'active' ? 'bg-green-100 text-green-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    <span className={`w-2 h-2 mr-2 rounded-full ${
                      client.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                    }`}></span>
                    {client.status || 'Active'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  Joined {formatDate(client.created_at)}
                </p>
              </div>
            </div>

            {/* Facility Card */}
            {client.facilities && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Facility</h2>
                </div>
                <div className="p-6">
                  <h3 className="font-medium text-gray-900">{client.facilities.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{client.facilities.address}</p>
                  {client.facilities.phone_number && (
                    <p className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Phone:</span> {client.facilities.phone_number}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Statistics Card */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Trip Statistics</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
                  <p className="text-sm text-gray-500">Total Trips</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.monthTrips}</p>
                  <p className="text-sm text-gray-500">This Month</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{client.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}