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
      facility.contact_phone?.includes(searchTerm) ||
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
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
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
        <h1 className="text-2xl font-bold">Facility Management</h1>
        <Link
          href="/facilities/add"
          className="bg-[#84CED3] text-white px-4 py-2 rounded-lg hover:bg-[#70B8BD] transition-colors"
        >
          Add New Facility
        </Link>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, address..."
              className="w-full p-2 border rounded focus:ring-2 focus:ring-[#84CED3] border-gray-300"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-[#84CED3] border-gray-300"
            >
              <option value="all">All Facilities</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="new">New (No Clients)</option>
              <option value="high_volume">High Volume (50+ Clients)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-[#84CED3] border-gray-300"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="client_count">Client Count</option>
              <option value="trip_count">Trip Count</option>
              <option value="date_joined">Date Joined</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Sort Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-[#84CED3] border-gray-300"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Facilities Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facility Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedFacilities.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No facilities found
                  </td>
                </tr>
              ) : (
                sortedFacilities.map((facility) => (
                  <tr key={facility.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{facility.name || 'Unnamed Facility'}</div>
                      <div className="text-xs text-gray-500">ID: {facility.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{facility.contact_email || 'No email'}</div>
                      <div className="text-sm text-gray-500">{facility.contact_phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{facility.address || 'No address'}</div>
                      <div className="text-sm text-gray-500">{facility.city}, {facility.state} {facility.zip_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(facility.status || 'inactive')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <span>Clients: {facility.client_count || 0}</span>
                        <span>Trips: {facility.trip_count || 0}</span>
                        <span>Active Users: {facility.active_users || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/facilities/${facility.id}`}
                          className="text-[#84CED3] hover:text-[#70B8BD] transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/facilities/${facility.id}/edit`}
                          className="text-[#84CED3] hover:text-[#70B8BD] transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/facilities/${facility.id}/clients`}
                          className="text-[#84CED3] hover:text-[#70B8BD] transition-colors"
                        >
                          Clients
                        </Link>
                        <Link
                          href={`/facilities/${facility.id}/trips`}
                          className="text-[#84CED3] hover:text-[#70B8BD] transition-colors"
                        >
                          Trips
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
      <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="text-sm text-gray-600">
          Total Facilities: <span className="font-medium">{facilities.length}</span> |
          Showing: <span className="font-medium">{sortedFacilities.length}</span> |
          Active: <span className="font-medium">{facilities.filter(f => f.status === 'active').length}</span> |
          Total Clients: <span className="font-medium">{facilities.reduce((sum, f) => sum + (f.client_count || 0), 0)}</span> |
          Total Trips: <span className="font-medium">{facilities.reduce((sum, f) => sum + (f.trip_count || 0), 0)}</span>
        </div>
      </div>
    </div>
  );
}