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
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      inactive: 'bg-surface text-primary dark:bg-surface dark:text-primary',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
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
    <div className="container mx-auto px-4 py-8 bg-background text-primary min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Client Management</h1>
        <Link
          href="/clients/add"
          className="bg-primary text-onPrimary px-4 py-2 rounded hover:opacity-90 transition-opacity"
        >
          Add New Client
        </Link>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-surface p-4 rounded-lg shadow-sm mb-6 border border-disabled/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full p-2 border border-disabled/30 rounded bg-background text-primary focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border border-disabled/30 rounded bg-background text-primary focus:ring-2 focus:ring-primary focus:border-primary"
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
              className="w-full p-2 border border-disabled/30 rounded bg-background text-primary focus:ring-2 focus:ring-primary focus:border-primary"
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
              className="w-full p-2 border border-disabled/30 rounded bg-background text-primary focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-surface rounded-lg shadow overflow-hidden border border-disabled/20">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-disabled/20">
            <thead className="bg-primary/5">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary/70 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary/70 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary/70 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary/70 uppercase tracking-wider">
                  Trips
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary/70 uppercase tracking-wider">
                  Last Trip
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-disabled/20">
              {sortedClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-disabled">
                    No clients found
                  </td>
                </tr>
              ) : (
                sortedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary">{client.full_name || 'Unnamed'}</div>
                      <div className="text-xs text-disabled">ID: {client.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary">{client.email}</div>
                      <div className="text-sm text-disabled">{client.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(client.status || 'inactive')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-disabled">
                      {client.trip_count || 0} trips
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.last_trip ? (
                        <div>
                          <div className="text-sm text-primary">
                            {new Date(client.last_trip.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs">
                            {getStatusBadge(client.recent_status)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-disabled">No trips</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-secondary hover:text-primary transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="text-secondary hover:text-primary transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleCreateTrip(client.id)}
                          className="text-secondary hover:text-primary transition-colors"
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
      <div className="mt-6 bg-surface p-4 rounded-lg shadow-sm border border-disabled/20">
        <div className="text-sm text-disabled">
          Total Clients: <span className="font-medium">{clients.length}</span> |
          Showing: <span className="font-medium">{sortedClients.length}</span> |
          Active: <span className="font-medium">{clients.filter(c => c.status === 'active').length}</span> |
          With Trips: <span className="font-medium">{clients.filter(c => c.trip_count > 0).length}</span>
        </div>
      </div>
    </div>
  );
}