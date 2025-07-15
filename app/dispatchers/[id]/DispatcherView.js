'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusBadge(status) {
  const statusConfig = {
    'pending': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      dot: 'bg-yellow-400'
    },
    'upcoming': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-400'
    },
    'in_progress': {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-200',
      dot: 'bg-purple-400'
    },
    'completed': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      dot: 'bg-green-400'
    },
    'cancelled': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      dot: 'bg-red-400'
    }
  };

  const config = statusConfig[status] || statusConfig['pending'];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${config.dot}`}></span>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </span>
  );
}

export default function DispatcherView({ user, userProfile, dispatcher, trips }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  
  const getFullName = () => {
    if (dispatcher.first_name && dispatcher.last_name) {
      return `${dispatcher.first_name} ${dispatcher.last_name}`;
    } else if (dispatcher.first_name) {
      return dispatcher.first_name;
    } else if (dispatcher.last_name) {
      return dispatcher.last_name;
    }
    return 'Unnamed Dispatcher';
  };

  // Calculate statistics
  const stats = {
    total_trips: trips.length,
    active_trips: trips.filter(t => ['pending', 'upcoming', 'in_progress'].includes(t.status)).length,
    completed_trips: trips.filter(t => t.status === 'completed').length,
    cancelled_trips: trips.filter(t => t.status === 'cancelled').length,
    unique_clients: [...new Set(trips.map(t => t.user_id))].length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} userProfile={userProfile} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dispatchers')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dispatchers
              </button>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/dispatchers/${dispatcher.id}/edit`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Edit Dispatcher
              </Link>
            </div>
          </div>
          
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-gray-900">{getFullName()}</h1>
            <p className="mt-2 text-gray-600">Dispatcher Details & Performance</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trips'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trip History ({trips.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dispatcher Information */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">Dispatcher Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{getFullName()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{dispatcher.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{dispatcher.phone_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900">Dispatcher</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Joined</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(dispatcher.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User ID</label>
                    <p className="mt-1 text-sm text-gray-500 font-mono">{dispatcher.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Statistics */}
            <div>
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">Performance Statistics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Trips</span>
                    <span className="text-lg font-semibold">{stats.total_trips}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Trips</span>
                    <span className="text-lg font-semibold text-blue-600">{stats.active_trips}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed Trips</span>
                    <span className="text-lg font-semibold text-green-600">{stats.completed_trips}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cancelled Trips</span>
                    <span className="text-lg font-semibold text-red-600">{stats.cancelled_trips}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unique Clients</span>
                    <span className="text-lg font-semibold">{stats.unique_clients}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Trip History</h2>
              <p className="text-sm text-gray-600 mt-1">All trips managed by this dispatcher</p>
            </div>
            
            {trips.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No trips found</h3>
                <p className="mt-1 text-sm text-gray-500">This dispatcher has not been assigned any trips yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trip ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {trip.id?.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{trip.client_name || 'Unknown Client'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">From:</div>
                            <div className="text-gray-600 max-w-xs truncate">{trip.pickup_address || 'Not specified'}</div>
                            <div className="font-medium mt-1">To:</div>
                            <div className="text-gray-600 max-w-xs truncate">{trip.destination_address || 'Not specified'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(trip.pickup_time || trip.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(trip.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/trips/${trip.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}