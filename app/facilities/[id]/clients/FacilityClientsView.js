'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FacilityClientsView({ facility, clients, user, userProfile }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const router = useRouter();

  // Filter clients by search term
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${client.profiles?.first_name || ''} ${client.profiles?.last_name || ''}`.toLowerCase();
    
    return (
      fullName.includes(searchLower) ||
      client.profiles?.email?.toLowerCase().includes(searchLower) ||
      client.profiles?.phone_number?.includes(searchTerm) ||
      client.emergency_contact_name?.toLowerCase().includes(searchLower)
    );
  });

  // Sort clients
  const sortedClients = [...filteredClients].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`;
        bVal = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`;
        break;
      case 'email':
        aVal = a.profiles?.email || '';
        bVal = b.profiles?.email || '';
        break;
      case 'trips':
        aVal = a.trip_count || 0;
        bVal = b.trip_count || 0;
        break;
      case 'created':
        aVal = new Date(a.created_at || 0);
        bVal = new Date(b.created_at || 0);
        break;
      default:
        return 0;
    }
    
    if (sortBy === 'trips' || sortBy === 'created') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    } else {
      return sortOrder === 'asc' ? 
        aVal.toString().localeCompare(bVal.toString()) :
        bVal.toString().localeCompare(aVal.toString());
    }
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <nav className="text-sm text-gray-500 mb-2">
                <Link href="/facilities" className="hover:text-blue-600">Facilities</Link>
                <span className="mx-2">/</span>
                <Link href={`/facilities/${facility.id}`} className="hover:text-blue-600">{facility.name}</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-900">Clients</span>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900">{facility.name} - Clients</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage clients associated with this facility
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Link
                href={`/facilities/${facility.id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Facility
              </Link>
              <Link
                href={`/facilities/${facility.id}/clients/add`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Client
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Clients</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{clients.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Active Clients</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {clients.filter(c => c.status === 'active').length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Trips</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">
              {clients.reduce((sum, c) => sum + (c.trip_count || 0), 0)}
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Search & Filter</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="trips">Trip Count</option>
                  <option value="created">Date Added</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Mobile Card View */}
          <div className="lg:hidden">
            {sortedClients.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {clients.length === 0 ? 'No clients found for this facility' : 'No clients match your search'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sortedClients.map((client) => (
                  <div key={client.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {client.profiles?.first_name} {client.profiles?.last_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {client.profiles?.email}
                        </p>
                        <p className="text-sm text-gray-600">
                          {client.profiles?.phone_number}
                        </p>
                        <div className="mt-3 flex items-center space-x-4 text-sm">
                          <span className="text-gray-500">Trips: <span className="font-medium text-gray-900">{client.trip_count || 0}</span></span>
                          <span className="text-gray-500">Added: <span className="font-medium text-gray-900">{formatDate(client.created_at)}</span></span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.status || 'active'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/clients/${client.user_id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View Client Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Information
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedClients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      {clients.length === 0 ? 'No clients found for this facility' : 'No clients match your search'}
                    </td>
                  </tr>
                ) : (
                  sortedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {client.profiles?.first_name} {client.profiles?.last_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            ID: {client.user_id?.substring(0, 8)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{client.profiles?.email || 'No email'}</div>
                          <div className="text-gray-500">{client.profiles?.phone_number || 'No phone'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center space-x-6 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">{client.trip_count || 0}</div>
                            <div className="text-gray-500">Trips</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">{formatDate(client.created_at)}</div>
                            <div className="text-gray-500">Added</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/clients/${client.user_id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {sortedClients.length} of {clients.length} clients
        </div>
      </div>
    </div>
  );
}