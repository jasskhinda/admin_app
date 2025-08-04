'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRealtimeTripUpdates } from '@/hooks/useRealtimeTripUpdates';
import { createClient } from '@/utils/supabase/client';

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
    'awaiting_driver_acceptance': {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200',
      dot: 'bg-orange-400'
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
      {status === 'awaiting_driver_acceptance' ? 'Waiting Driver Acceptance' : 
       status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </span>
  );
}

function getClientName(trip) {
  // Individual booking
  if (trip.user_profile) {
    return trip.user_profile.full_name || 
           `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 
           trip.user_profile.email || 
           'Individual Client';
  }
  
  // Facility managed client
  if (trip.managed_client) {
    return `${trip.managed_client.first_name || ''} ${trip.managed_client.last_name || ''}`.trim() || 
           trip.managed_client.email || 
           'Facility Client';
  }
  
  // Fallback - try to get name from basic trip data
  if (trip.client_name) return trip.client_name;
  if (trip.passenger_name) return trip.passenger_name;
  
  // If we have user_id but no user_profile data, show partial ID
  if (trip.user_id) return `User ${trip.user_id.substring(0, 8)}...`;
  
  // If we have facility info but no managed_client, show facility name
  if (trip.facility_id && trip.facility) return `Facility: ${trip.facility.name}`;
  if (trip.facility_id) return `Facility ${trip.facility_id.substring(0, 8)}...`;
  
  return 'Unknown Client';
}

function getClientDetails(trip) {
  // Individual booking (most trips from debug data)
  if (trip.user_profile) {
    return {
      type: 'Individual',
      email: trip.user_profile.email || 'No email available',
      phone: trip.user_profile.phone_number || 'No phone available',
      facility: null
    };
  }
  
  // Facility managed client
  if (trip.managed_client) {
    const facilityInfo = trip.facility ? 
      `${trip.facility.name} (${trip.facility.contact_email || trip.facility.phone_number || 'No contact info'})` :
      (trip.facility_id ? `Facility ID: ${trip.facility_id.substring(0, 8)}...` : 'Facility Trip');
    
    return {
      type: 'Facility',
      email: trip.managed_client.email || 'No email available',
      phone: trip.managed_client.phone_number || 'No phone available',
      facility: facilityInfo
    };
  }
  
  // Check if this is a facility trip but managed_client didn't populate
  if (trip.facility_id && !trip.user_profile) {
    const facilityInfo = trip.facility ? 
      `${trip.facility.name} (${trip.facility.contact_email || trip.facility.phone_number || 'No contact info'})` :
      `Facility ID: ${trip.facility_id.substring(0, 8)}...`;
    
    return {
      type: 'Facility',
      email: trip.client_email || 'No email available',
      phone: trip.client_phone || 'No phone available',
      facility: facilityInfo
    };
  }
  
  return {
    type: 'Unknown',
    email: 'N/A',
    phone: 'N/A',
    facility: null
  };
}

export default function AdminTripsView({ trips: initialTrips = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  // Removed action loading and message state - admin is read-only
  
  // Removed driver assignment modal state - now redirects to drivers page
  
  const router = useRouter();
  
  // Use real-time updates for trips (read-only for admin)
  const { trips, lastUpdate } = useRealtimeTripUpdates(initialTrips);

  // Compute statistics
  const stats = useMemo(() => {
    const total = trips.length;
    const byStatus = trips.reduce((acc, trip) => {
      acc[trip.status] = (acc[trip.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      pending: byStatus.pending || 0,
      upcoming: byStatus.upcoming || 0,
      awaiting_driver_acceptance: byStatus.awaiting_driver_acceptance || 0,
      in_progress: byStatus.in_progress || 0,
      completed: byStatus.completed || 0,
      cancelled: byStatus.cancelled || 0
    };
  }, [trips]);

  // Filter and sort trips
  const filteredAndSortedTrips = useMemo(() => {
    let filtered = trips.filter(trip => {
      const clientName = getClientName(trip);
      const matchesSearch = searchTerm === '' || 
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.facility?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'client':
          aVal = getClientName(a);
          bVal = getClientName(b);
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'pickup_time':
          aVal = new Date(a.pickup_time || a.created_at);
          bVal = new Date(b.pickup_time || b.created_at);
          break;
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
      }
      
      if (sortBy === 'pickup_time' || sortBy === 'created_at') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const comparison = aVal.toString().localeCompare(bVal.toString());
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [trips, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Removed trip action functions - admin role is read-only for trips
  // All trip actions (approve, reject, complete, assign driver) are handled by dispatchers

  const SortIcon = ({ field }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Admin Read-Only Notice */}
      <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-blue-800 font-medium">
            Admin View - Read Only Access. Trip actions (approve, reject, assign drivers) are managed by dispatchers.
          </p>
        </div>
      </div>

      {/* Real-time Status Indicator */}
      {lastUpdate && (
        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            🔄 Last updated: {lastUpdate.toLocaleTimeString()} (Real-time sync active)
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trip Overview</h1>
            <p className="mt-2 text-sm text-gray-600">
              Comprehensive read-only view of all transportation requests and bookings
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="text-sm text-gray-500">
              Trip creation is managed by dispatchers
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Trips</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
          <div className="text-sm text-gray-500">Upcoming</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{stats.awaiting_driver_acceptance}</div>
          <div className="text-sm text-gray-500">Waiting Driver</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-sm text-gray-500">Cancelled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by client, address, facility, or trip ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="upcoming">Upcoming</option>
            <option value="awaiting_driver_acceptance">Waiting Driver Acceptance</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredAndSortedTrips.length} of {trips.length} trips
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Trip ID
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[200px]"
                  onClick={() => handleSort('client')}
                >
                  <div className="flex items-center">
                    Client
                    <SortIcon field="client" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[280px]">
                  Route
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-32"
                  onClick={() => handleSort('pickup_time')}
                >
                  <div className="flex items-center">
                    Date/Time
                    <SortIcon field="pickup_time" />
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-28"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Status Info
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedTrips.map((trip) => {
                const clientName = getClientName(trip);
                const clientDetails = getClientDetails(trip);
                
                return (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900 font-mono">
                        {trip.id?.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 mt-0.5">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                            clientDetails.type === 'Facility' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {clientDetails.type === 'Facility' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="ml-2 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {clientName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {clientDetails.email}
                          </div>
                          {clientDetails.facility && (
                            <div className="text-xs text-blue-600 font-medium truncate">
                              {clientDetails.facility}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="space-y-1">
                        <div className="flex items-start">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          <div className="text-xs text-gray-700 line-clamp-2">
                            {trip.pickup_address || 'Pickup location not specified'}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          <div className="text-xs text-gray-700 line-clamp-2">
                            {trip.destination_address || 'Destination not specified'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {formatDate(trip.pickup_time || trip.created_at)}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {getStatusBadge(trip.status)}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-1">
                        <Link
                          href={`/trips/${trip.id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                        >
                          View Details
                        </Link>
                        
                        {/* Admin Read-Only - Show status info but no action buttons */}
                        {trip.status === 'pending' && (
                          <div className="text-xs text-yellow-600 font-medium">
                            Awaiting Dispatcher Approval
                          </div>
                        )}
                        
                        {trip.status === 'upcoming' && !trip.driver_id && (
                          <div className="text-xs text-blue-600 font-medium">
                            Needs Driver Assignment
                          </div>
                        )}
                        
                        {trip.status === 'in_progress' && (
                          <div className="text-xs text-purple-600 font-medium">
                            Trip In Progress
                          </div>
                        )}
                        
                        {/* Show driver info if assigned */}
                        {trip.driver_id && trip.status === 'upcoming' && (
                          <div className="text-xs text-green-600 font-medium">
                            Driver Assigned
                          </div>
                        )}
                        
                        {trip.status === 'completed' && (
                          <div className="text-xs text-green-600 font-medium">
                            Trip Completed
                          </div>
                        )}
                        
                        {trip.status === 'cancelled' && (
                          <div className="text-xs text-red-600 font-medium">
                            Trip Cancelled
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredAndSortedTrips.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No trips found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No trips match your current filters.' 
                  : 'No trips available. Trip creation is managed by dispatchers.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}