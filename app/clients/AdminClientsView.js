'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminClientsView({ user, userProfile, data }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, individual, facility
    const [selectedFacility, setSelectedFacility] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [expandedFacilities, setExpandedFacilities] = useState(new Set());

    // Combine all clients for filtering and sorting
    const allClients = useMemo(() => {
        const combined = [
            ...data.individualClients,
            ...data.facilityClients,
            ...data.managedClients
        ];
        return combined;
    }, [data]);

    // Group facility clients by facility
    const clientsByFacility = useMemo(() => {
        const grouped = {};
        
        // Group authenticated facility clients
        data.facilityClients.forEach(client => {
            const facilityName = client.facilities?.name || 'Unknown Facility';
            const facilityId = client.facility_id;
            if (!grouped[facilityId]) {
                grouped[facilityId] = {
                    facilityName,
                    facilityData: client.facilities,
                    clients: []
                };
            }
            grouped[facilityId].clients.push(client);
        });

        // Group managed clients
        data.managedClients.forEach(client => {
            const facilityName = client.facilities?.name || 'Unknown Facility';
            const facilityId = client.facility_id;
            if (!grouped[facilityId]) {
                grouped[facilityId] = {
                    facilityName,
                    facilityData: client.facilities,
                    clients: []
                };
            }
            grouped[facilityId].clients.push(client);
        });

        return grouped;
    }, [data]);

    // Filter clients
    const filteredClients = useMemo(() => {
        let clients = allClients;

        // Filter by type
        if (filterType === 'individual') {
            clients = data.individualClients;
        } else if (filterType === 'facility') {
            clients = [...data.facilityClients, ...data.managedClients];
        }

        // Filter by specific facility
        if (selectedFacility !== 'all') {
            clients = clients.filter(client => client.facility_id === selectedFacility);
        }

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            clients = clients.filter(client => {
                const fullName = client.full_name?.toLowerCase() || '';
                const email = client.email?.toLowerCase() || '';
                const phone = client.phone_number || '';
                return fullName.includes(search) || email.includes(search) || phone.includes(search);
            });
        }

        // Sort
        clients.sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'name':
                    aVal = a.full_name || '';
                    bVal = b.full_name || '';
                    break;
                case 'email':
                    aVal = a.email || '';
                    bVal = b.email || '';
                    break;
                case 'trips':
                    aVal = a.trip_count || 0;
                    bVal = b.trip_count || 0;
                    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                case 'facility':
                    aVal = a.facilities?.name || 'ZZZ';
                    bVal = b.facilities?.name || 'ZZZ';
                    break;
                case 'created':
                    aVal = new Date(a.created_at || 0);
                    bVal = new Date(b.created_at || 0);
                    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                default:
                    return 0;
            }
            
            if (typeof aVal === 'string') {
                return sortOrder === 'asc' 
                    ? aVal.localeCompare(bVal) 
                    : bVal.localeCompare(aVal);
            }
            return 0;
        });

        return clients;
    }, [allClients, data, filterType, selectedFacility, searchTerm, sortBy, sortOrder]);

    const toggleFacility = (facilityId) => {
        const newExpanded = new Set(expandedFacilities);
        if (newExpanded.has(facilityId)) {
            newExpanded.delete(facilityId);
        } else {
            newExpanded.add(facilityId);
        }
        setExpandedFacilities(newExpanded);
    };

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
                            <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Manage all individual and facility-based clients
                            </p>
                        </div>
                        <Link
                            href="/clients/add"
                            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add New Client
                        </Link>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                                <p className="text-2xl font-semibold text-gray-900">{data.totalClients}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Individual Clients</p>
                                <p className="text-2xl font-semibold text-gray-900">{data.individualClients.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Facility Clients</p>
                                <p className="text-2xl font-semibold text-gray-900">{data.facilityClients.length + data.managedClients.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 bg-orange-100 rounded-lg">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Facilities</p>
                                <p className="text-2xl font-semibold text-gray-900">{Object.keys(clientsByFacility).length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Filters & Search</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by name, email, phone..."
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Client Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Client Type</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Clients</option>
                                    <option value="individual">Individual Clients</option>
                                    <option value="facility">Facility Clients</option>
                                </select>
                            </div>

                            {/* Facility Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Facility</label>
                                <select
                                    value={selectedFacility}
                                    onChange={(e) => setSelectedFacility(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={filterType === 'individual'}
                                >
                                    <option value="all">All Facilities</option>
                                    {data.facilities.map(facility => (
                                        <option key={facility.id} value={facility.id}>
                                            {facility.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                <div className="flex space-x-2">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="name">Name</option>
                                        <option value="email">Email</option>
                                        <option value="facility">Facility</option>
                                        <option value="trips">Trips</option>
                                        <option value="created">Date Added</option>
                                    </select>
                                    <button
                                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Clients Display */}
                {filterType === 'all' && searchTerm === '' ? (
                    // Categorized View
                    <div className="space-y-8">
                        {/* Individual Clients Section */}
                        {data.individualClients.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                    Individual Clients ({data.individualClients.length})
                                </h3>
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Client
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Contact
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Trips
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Joined
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {data.individualClients.map((client) => (
                                                    <tr key={client.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {client.full_name || 'Unknown'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                ID: {client.id.substring(0, 8)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <div>{client.email || 'No email'}</div>
                                                            <div>{client.phone_number || 'No phone'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {client.trip_count || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                                            {formatDate(client.created_at)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <Link
                                                                href={`/clients/${client.id}`}
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
                                </div>
                            </div>
                        )}

                        {/* Facility Clients Section */}
                        {Object.keys(clientsByFacility).length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                    Facility Clients
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(clientsByFacility).map(([facilityId, facilityData]) => (
                                        <div key={facilityId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                            <div
                                                className="px-6 py-4 bg-gray-50 cursor-pointer flex justify-between items-center"
                                                onClick={() => toggleFacility(facilityId)}
                                            >
                                                <div>
                                                    <h4 className="text-lg font-medium text-gray-900">
                                                        {facilityData.facilityName}
                                                    </h4>
                                                    <p className="text-sm text-gray-500">
                                                        {facilityData.clients.length} clients
                                                    </p>
                                                </div>
                                                <svg
                                                    className={`w-5 h-5 text-gray-400 transition-transform ${
                                                        expandedFacilities.has(facilityId) ? 'rotate-180' : ''
                                                    }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            {expandedFacilities.has(facilityId) && (
                                                <div className="border-t border-gray-200">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Client
                                                                </th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Contact
                                                                </th>
                                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Type
                                                                </th>
                                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Trips
                                                                </th>
                                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Actions
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {facilityData.clients.map((client) => (
                                                                <tr key={client.id} className="hover:bg-gray-50">
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {client.full_name || 'Unknown'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                        <div>{client.email || 'No email'}</div>
                                                                        <div>{client.phone_number || 'No phone'}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                            client.client_type === 'authenticated' 
                                                                                ? 'bg-green-100 text-green-800' 
                                                                                : 'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                            {client.client_type === 'authenticated' ? 'Registered' : 'Managed'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                                        <span className="text-sm font-medium text-gray-900">
                                                                            {client.trip_count || 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                        {client.client_type === 'authenticated' ? (
                                                                            <Link
                                                                                href={`/clients/${client.id}`}
                                                                                className="text-blue-600 hover:text-blue-900"
                                                                            >
                                                                                View Details
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="text-gray-400">Managed</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // Filtered/Searched Results
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Client
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Facility
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Trips
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredClients.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                                No clients found matching your criteria
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredClients.map((client) => (
                                            <tr key={client.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {client.full_name || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        ID: {client.id.substring(0, 8)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div>{client.email || 'No email'}</div>
                                                    <div>{client.phone_number || 'No phone'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {client.facilities?.name || 'Individual'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        client.client_type === 'authenticated' 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : client.client_type === 'managed'
                                                            ? 'bg-gray-100 text-gray-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {client.client_type === 'authenticated' && client.facility_id 
                                                            ? 'Facility' 
                                                            : client.client_type === 'managed' 
                                                            ? 'Managed' 
                                                            : 'Individual'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {client.trip_count || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {client.client_type === 'authenticated' ? (
                                                        <Link
                                                            href={`/clients/${client.id}`}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            View Details
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400">Managed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Results Summary */}
                <div className="mt-4 text-sm text-gray-600 text-center">
                    {filterType !== 'all' || searchTerm ? (
                        <span>Showing {filteredClients.length} of {data.totalClients} clients</span>
                    ) : (
                        <span>Total: {data.totalClients} clients across all categories</span>
                    )}
                </div>
            </div>
        </div>
    );
}