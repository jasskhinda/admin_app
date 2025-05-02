'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDriversView({ user, userProfile, drivers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const router = useRouter();

  // Filtering and sorting logic
  const filteredDrivers = drivers.filter(driver => {
    // Filter by search term
    const matchesSearch = 
      searchTerm === '' || 
      driver.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone?.includes(searchTerm) ||
      driver.vehicle?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicle?.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status if needed
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && driver.status === 'active') ||
      (filterStatus === 'inactive' && driver.status === 'inactive') ||
      (filterStatus === 'on_trip' && driver.status === 'on_trip') ||
      (filterStatus === 'pending_verification' && driver.status === 'pending_verification') ||
      (filterStatus === 'with_vehicle' && driver.vehicle);
    
    return matchesSearch && matchesStatus;
  });

  // Sort the filtered drivers
  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
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
    } else if (sortBy === 'completed_trips') {
      return sortOrder === 'asc' 
        ? (a.completed_trips || 0) - (b.completed_trips || 0)
        : (b.completed_trips || 0) - (a.completed_trips || 0);
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
      on_trip: 'bg-blue-100 text-blue-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const handleAssignTrip = (driverId) => {
    router.push(`/trips/new?driver=${driverId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Driver Management</h1>
        <Link
          href="/drivers/add"
          className="bg-primary text-onPrimary px-4 py-2 rounded hover:bg-opacity-90"
        >
          Add New Driver
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
              placeholder="Search by name, email, vehicle..."
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
              <option value="all">All Drivers</option>
              <option value="active">Active</option>
              <option value="on_trip">On Trip</option>
              <option value="inactive">Inactive</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="with_vehicle">With Vehicle</option>
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
              <option value="completed_trips">Completed Trips</option>
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

      {/* Drivers Table */}
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
                  Vehicle
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
              {sortedDrivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No drivers found
                  </td>
                </tr>
              ) : (
                sortedDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{driver.full_name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-500">ID: {driver.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.email}</div>
                      <div className="text-sm text-gray-500">{driver.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(driver.status || 'inactive')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {driver.vehicle ? (
                        <div className="text-sm">
                          <div className="font-medium">{driver.vehicle.make} {driver.vehicle.model}</div>
                          <div className="text-gray-500">{driver.vehicle.license_plate}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No vehicle</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <span>Trips: {driver.trip_count || 0}</span>
                        <span>Completed: {driver.completed_trips || 0}</span>
                        {driver.last_trip && (
                          <span className="text-xs text-gray-500">
                            Last: {new Date(driver.last_trip.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/drivers/${driver.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View
                        </Link>
                        <Link
                          href={`/drivers/${driver.id}/edit`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleAssignTrip(driver.id)}
                          className="text-primary hover:text-primary-dark"
                        >
                          Assign Trip
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
          Total Drivers: <span className="font-medium">{drivers.length}</span> |
          Showing: <span className="font-medium">{sortedDrivers.length}</span> |
          Active: <span className="font-medium">{drivers.filter(d => d.status === 'active').length}</span> |
          With Vehicle: <span className="font-medium">{drivers.filter(d => d.vehicle).length}</span>
        </div>
      </div>
    </div>
  );
}