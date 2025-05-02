'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDispatchersView({ user, userProfile, dispatchers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const router = useRouter();

  // Filtering and sorting logic
  const filteredDispatchers = dispatchers.filter(dispatcher => {
    // Filter by search term
    const matchesSearch = 
      searchTerm === '' || 
      dispatcher.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatcher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatcher.phone?.includes(searchTerm);
    
    // Filter by status if needed
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && dispatcher.status === 'active') ||
      (filterStatus === 'inactive' && dispatcher.status === 'inactive') ||
      (filterStatus === 'new' && dispatcher.trip_count === 0) ||
      (filterStatus === 'experienced' && dispatcher.trip_count > 50);
    
    return matchesSearch && matchesStatus;
  });

  // Sort the filtered dispatchers
  const sortedDispatchers = [...filteredDispatchers].sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? (a.full_name || '').localeCompare(b.full_name || '')
        : (b.full_name || '').localeCompare(a.full_name || '');
    } else if (sortBy === 'email') {
      return sortOrder === 'asc' 
        ? (a.email || '').localeCompare(b.email || '')
        : (b.email || '').localeCompare(a.email || '');
    } else if (sortBy === 'trip_count') {
      return sortOrder === 'asc' 
        ? (a.trip_count || 0) - (b.trip_count || 0)
        : (b.trip_count || 0) - (a.trip_count || 0);
    } else if (sortBy === 'client_count') {
      return sortOrder === 'asc' 
        ? (a.client_count || 0) - (b.client_count || 0)
        : (b.client_count || 0) - (a.client_count || 0);
    } else if (sortBy === 'date_joined') {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
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
      training: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dispatcher Management</h1>
        <Link
          href="/dispatchers/add"
          className="bg-primary text-onPrimary px-4 py-2 rounded hover:bg-opacity-90"
        >
          Add New Dispatcher
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
              <option value="all">All Dispatchers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="new">New (No Trips)</option>
              <option value="experienced">Experienced (50+ Trips)</option>
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
              <option value="trip_count">Trip Count</option>
              <option value="client_count">Client Count</option>
              <option value="date_joined">Date Joined</option>
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

      {/* Dispatchers Table */}
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
                  Performance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDispatchers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No dispatchers found
                  </td>
                </tr>
              ) : (
                sortedDispatchers.map((dispatcher) => (
                  <tr key={dispatcher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{dispatcher.full_name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-500">ID: {dispatcher.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{dispatcher.email}</div>
                      <div className="text-sm text-gray-500">{dispatcher.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(dispatcher.status || 'inactive')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <span>Trips Managed: {dispatcher.trip_count || 0}</span>
                        <span>Clients Served: {dispatcher.client_count || 0}</span>
                        <span>Active Trips: {dispatcher.active_trips || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/dispatchers/${dispatcher.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dispatchers/${dispatcher.id}/edit`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/dispatchers/${dispatcher.id}/trips`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View Trips
                        </Link>
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
          Total Dispatchers: <span className="font-medium">{dispatchers.length}</span> |
          Showing: <span className="font-medium">{sortedDispatchers.length}</span> |
          Active: <span className="font-medium">{dispatchers.filter(d => d.status === 'active').length}</span> |
          Total Trips Managed: <span className="font-medium">{dispatchers.reduce((sum, d) => sum + (d.trip_count || 0), 0)}</span>
        </div>
      </div>
    </div>
  );
}