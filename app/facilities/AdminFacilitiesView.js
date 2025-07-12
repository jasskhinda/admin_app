'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminFacilitiesView({ user, userProfile, facilities }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const router = useRouter();

  // Filtering and sorting logic
  const filteredFacilities = facilities.filter(facility => {
    // Filter by search term
    const matchesSearch = 
      searchTerm === '' || 
      facility.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.phone_number?.includes(searchTerm) ||
      facility.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status if needed
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && facility.status === 'active') ||
      (filterStatus === 'inactive' && facility.status === 'inactive') ||
      (filterStatus === 'new' && facility.client_count === 0) ||
      (filterStatus === 'high_volume' && facility.client_count > 50);
    
    return matchesSearch && matchesStatus;
  });

  // Sort the filtered facilities
  const sortedFacilities = [...filteredFacilities].sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? (a.name || '').localeCompare(b.name || '')
        : (b.name || '').localeCompare(a.name || '');
    } else if (sortBy === 'email') {
      return sortOrder === 'asc' 
        ? (a.contact_email || '').localeCompare(b.contact_email || '')
        : (b.contact_email || '').localeCompare(a.contact_email || '');
    } else if (sortBy === 'client_count') {
      return sortOrder === 'asc' 
        ? (a.client_count || 0) - (b.client_count || 0)
        : (b.client_count || 0) - (a.client_count || 0);
    } else if (sortBy === 'trip_count') {
      return sortOrder === 'asc' 
        ? (a.trip_count || 0) - (b.trip_count || 0)
        : (b.trip_count || 0) - (a.trip_count || 0);
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
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'suspended' ? 'bg-red-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'}`}></span>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Facility Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage healthcare facilities and their associated services
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                href="/facilities/add"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Facility
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Facilities</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{facilities.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Active</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">{facilities.filter(f => f.status === 'active').length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Clients</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">{facilities.reduce((sum, f) => sum + (f.client_count || 0), 0)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Trips</div>
            <div className="mt-1 text-2xl font-semibold text-purple-600">{facilities.reduce((sum, f) => sum + (f.trip_count || 0), 0)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Active Users</div>
            <div className="mt-1 text-2xl font-semibold text-indigo-600">{facilities.reduce((sum, f) => sum + (f.active_users || 0), 0)}</div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Search & Filter</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search facilities..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Facilities</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="new">New (No Clients)</option>
                  <option value="high_volume">High Volume (50+ Clients)</option>
                </select>
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
                  <option value="client_count">Client Count</option>
                  <option value="trip_count">Trip Count</option>
                  <option value="date_joined">Date Joined</option>
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

        {/* Facilities List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Mobile Card View */}
          <div className="lg:hidden">
            {sortedFacilities.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No facilities found
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sortedFacilities.map((facility) => (
                  <div key={facility.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {facility.name || 'Unnamed Facility'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {facility.facility_type || 'No type'} • {facility.address || 'No address'}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {facility.contact_email || 'No email'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {facility.phone_number || 'No phone'}
                        </p>
                        <div className="mt-3 flex items-center space-x-4 text-sm">
                          <span className="text-gray-500">Clients: <span className="font-medium text-gray-900">{facility.client_count || 0}</span></span>
                          <span className="text-gray-500">Trips: <span className="font-medium text-gray-900">{facility.trip_count || 0}</span></span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(facility.status || 'active')}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/facilities/${facility.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View Facility
                      </Link>
                      <span className="text-gray-300">•</span>
                      <Link
                        href={`/facilities/${facility.id}/edit`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Edit Facility
                      </Link>
                      <span className="text-gray-300">•</span>
                      <Link
                        href={`/facilities/${facility.id}/clients`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View Facility Clients
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
                    Facility Information
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metrics
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFacilities.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No facilities found
                    </td>
                  </tr>
                ) : (
                  sortedFacilities.map((facility) => (
                    <tr key={facility.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {facility.name || 'Unnamed Facility'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {facility.facility_type || 'No type'} • {facility.address || 'No address'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            ID: {facility.id.substring(0, 8)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{facility.contact_email || 'No email'}</div>
                          <div className="text-gray-500">{facility.phone_number || 'No phone'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(facility.status || 'active')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center space-x-6 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">{facility.client_count || 0}</div>
                            <div className="text-gray-500">Clients</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">{facility.trip_count || 0}</div>
                            <div className="text-gray-500">Trips</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">{facility.active_users || 0}</div>
                            <div className="text-gray-500">Users</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/facilities/${facility.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            View Facility
                          </Link>
                          <Link
                            href={`/facilities/${facility.id}/edit`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            Edit Facility
                          </Link>
                          <Link
                            href={`/facilities/${facility.id}/clients`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            View Facility Clients
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
        
        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {sortedFacilities.length} of {facilities.length} facilities
      </div>
  );
}