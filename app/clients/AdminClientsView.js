'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminClientsView({ user, userProfile, clients }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const router = useRouter();

  // Filtering and sorting logic
  const filteredClients = clients.filter(client => {
    // Filter by search term
    const matchesSearch = 
      searchTerm === '' || 
      client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);
    
    // Filter by status if needed
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && client.status === 'active') ||
      (filterStatus === 'inactive' && client.status === 'inactive') ||
      (filterStatus === 'recent' && client.last_trip && 
        new Date(client.last_trip.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesStatus;
  });

  // Sort the filtered clients
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? (a.full_name || '').localeCompare(b.full_name || '')
        : (b.full_name || '').localeCompare(a.full_name || '');
    } else if (sortBy === 'email') {
      return sortOrder === 'asc' 
        ? (a.email || '').localeCompare(b.email || '')
        : (b.email || '').localeCompare(a.email || '');
    } else if (sortBy === 'trips') {
      return sortOrder === 'asc' 
        ? (a.trip_count || 0) - (b.trip_count || 0)
        : (b.trip_count || 0) - (a.trip_count || 0);
    } else if (sortBy === 'last_trip') {
      const dateA = a.last_trip ? new Date(a.last_trip.created_at) : new Date(0);
      const dateB = b.last_trip ? new Date(b.last_trip.created_at) : new Date(0);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  // Function to generate a status badge
  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const handleCreateTrip = (clientId) => {
    router.push(`/trips/new?client=${clientId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Client Management</h1>
        <Link
          href="/clients/add"
          className="bg-primary text-onPrimary px-4 py-2 rounded hover:bg-opacity-90"
        >
          Add New Client
        </Link>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-surface p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Clients</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="recent">Recent Activity (30 days)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="trips">Trip Count</option>
              <option value="last_trip">Last Trip Date</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Sort Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trips
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Trip
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No clients found
                  </td>
                </tr>
              ) : (
                sortedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{client.full_name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-500">ID: {client.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.email}</div>
                      <div className="text-sm text-gray-500">{client.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(client.status || 'inactive')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.trip_count || 0} trips
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.last_trip ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(client.last_trip.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs">
                            {getStatusBadge(client.recent_status)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No trips</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View
                        </Link>
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleCreateTrip(client.id)}
                          className="text-primary hover:text-primary-dark"
                        >
                          New Trip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="mt-6 bg-surface p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-600">
          Total Clients: <span className="font-medium">{clients.length}</span> |
          Showing: <span className="font-medium">{sortedClients.length}</span> |
          Active: <span className="font-medium">{clients.filter(c => c.status === 'active').length}</span> |
          With Trips: <span className="font-medium">{clients.filter(c => c.trip_count > 0).length}</span>
        </div>
      </div>
    </div>
  );
}