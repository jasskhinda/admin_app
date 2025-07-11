'use client';

import { useState } from 'react';
import Link from 'next/link';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusColor(status) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'upcoming':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-purple-100 text-purple-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function AdminTripsView({ trips }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Helper function to get client name
  const getClientName = (trip) => {
    if (trip.user_profile) {
      // Individual booking trip
      return trip.user_profile.full_name || 
        (trip.user_profile.first_name && trip.user_profile.last_name 
          ? `${trip.user_profile.first_name} ${trip.user_profile.last_name}` 
          : trip.user_profile.email || 'Individual Client');
    } else if (trip.managed_client) {
      // Facility managed client trip
      const clientName = trip.managed_client.first_name && trip.managed_client.last_name
        ? `${trip.managed_client.first_name} ${trip.managed_client.last_name}`
        : trip.managed_client.email || 'Managed Client';
      
      // Add facility name if available
      if (trip.facility?.name) {
        return `${clientName} (${trip.facility.name})`;
      }
      return clientName;
    } else if (trip.facility) {
      // Facility trip without specific client
      return `Facility: ${trip.facility.name}`;
    }
    return 'Unknown Client';
  };

  // Filter trips based on search and status
  const filteredTrips = trips.filter(trip => {
    const clientName = getClientName(trip);
    
    const matchesSearch = 
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.destination_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">All Trips</h1>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by client, address, or trip ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3]"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84CED3]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="upcoming">Upcoming</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <Link
            href="/trips/new"
            className="px-6 py-2 bg-[#84CED3] text-white rounded-lg hover:bg-[#70B8BD] transition-colors"
          >
            New Trip
          </Link>
        </div>
        
        {/* Results count */}
        <p className="text-gray-600">
          Showing {filteredTrips.length} of {trips.length} trips
        </p>
      </div>
      
      {/* Trips Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                  Pickup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
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
              {filteredTrips.map((trip) => {
                const clientName = getClientName(trip);
                
                return (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trip.id?.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clientName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {trip.pickup_address || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {trip.destination_address || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trip.pickup_time ? formatDate(trip.pickup_time) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(trip.status)}`}>
                        {trip.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="text-[#84CED3] hover:text-[#70B8BD]"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredTrips.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No trips found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}