'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminHeader from '../components/AdminHeader';

// Dashboard card component
function DashboardCard({ title, count, icon, linkHref, linkText, color = 'primary' }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-700">{title}</h3>
          <p className="text-3xl font-bold mt-2 text-[#84CED3]">{count}</p>
        </div>
        <div className="p-3 rounded-full bg-[#84CED3] bg-opacity-10">
          <Image src={icon} alt={title} width={24} height={24} />
        </div>
      </div>
      {linkHref && (
        <div className="mt-4">
          <Link href={linkHref} className="text-[#84CED3] hover:text-[#70B8BD] transition-colors">
            {linkText}
          </Link>
        </div>
      )}
    </div>
  );
}

// Recent activity item component
function ActivityItem({ title, description, time, status }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border-b border-gray-200 py-3 last:border-0">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-800">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500">{time}</span>
          {status && (
            <span className={`text-xs px-2 py-1 rounded-full mt-1 ${getStatusColor(status)}`}>
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Action card component
function ActionCard({ title, description, icon, href }) {
  return (
    <Link 
      href={href}
      className="block bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-[#84CED3]"
    >
      <div className="flex items-start space-x-4">
        <div className="p-3 rounded-full bg-[#84CED3] bg-opacity-10">
          <Image src={icon} alt={title} width={24} height={24} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-700">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function AdminDashboardView({ userCounts, recentTrips, pendingDrivers, userProfile, facilities }) {
  // Calculate counts
  const clientCount = userCounts.find(count => count.role === 'client')?.count || 0;
  const driverCount = userCounts.find(count => count.role === 'driver')?.count || 0;
  const dispatcherCount = userCounts.find(count => count.role === 'dispatcher')?.count || 0;
  const facilityCount = facilities ? facilities.length : 0;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* AdminHeader is rendered in layout.js, no need to duplicate it here */}
      
      <main className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Overview</h2>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard 
            title="Clients" 
            count={clientCount}
            icon="/window.svg"
            linkHref="/clients"
            linkText="View all clients"
          />
          <DashboardCard 
            title="Drivers" 
            count={driverCount}
            icon="/file.svg"
            linkHref="/drivers"
            linkText="View all drivers"
          />
          <DashboardCard 
            title="Dispatchers" 
            count={dispatcherCount}
            icon="/globe.svg" 
            linkHref="/dispatchers"
            linkText="View all dispatchers"
          />
          <DashboardCard 
            title="Facilities" 
            count={facilityCount}
            icon="/window.svg" 
            linkHref="/facilities"
            linkText="View all facilities"
          />
        </div>
        
        {/* Management Cards */}
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <ActionCard 
            title="Manage Clients" 
            description="Add, edit, or remove clients" 
            icon="/window.svg" 
            href="/clients" 
          />
          <ActionCard 
            title="Manage Drivers" 
            description="Add, edit, or remove drivers" 
            icon="/file.svg" 
            href="/drivers" 
          />
          <ActionCard 
            title="Manage Dispatchers" 
            description="Add, edit, or remove dispatchers" 
            icon="/globe.svg" 
            href="/dispatchers" 
          />
          <ActionCard 
            title="Manage Facilities" 
            description="Add, edit, or remove facilities" 
            icon="/window.svg" 
            href="/facilities" 
          />
          <ActionCard 
            title="Invoices" 
            description="Manage billing and invoices" 
            icon="/file.svg" 
            href="/invoices" 
          />
        </div>
        
        {/* Recent Activity and Pending Approvals */}
        <div className="grid grid-cols-1 gap-6">
          {/* Recent Trips - Full Width */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Recent Trips</h2>
              <Link href="/trips" className="text-[#84CED3] hover:text-[#70B8BD] transition-colors text-sm font-medium">
                View all trips →
              </Link>
            </div>
            
            {recentTrips && recentTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Facility Trips Section */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0v-4a2 2 0 011-1h4a2 2 0 011 1v4M7 10h10M7 6h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-800">Facility Trips</h3>
                  </div>
                  
                  {(() => {
                    const facilityTrips = recentTrips.filter(trip => trip.facility_id);
                    
                    if (facilityTrips.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <svg className="w-12 h-12 text-blue-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0v-4a2 2 0 011-1h4a2 2 0 011 1v4" />
                          </svg>
                          <p className="text-blue-600 text-sm">No recent facility trips</p>
                        </div>
                      );
                    }
                    
                    // Group facility trips by facility
                    const tripsByFacility = facilityTrips.reduce((acc, trip) => {
                      const facilityName = trip.facility?.name || 'Unknown Facility';
                      if (!acc[facilityName]) {
                        acc[facilityName] = [];
                      }
                      acc[facilityName].push(trip);
                      return acc;
                    }, {});
                    
                    return (
                      <div className="space-y-4">
                        {Object.entries(tripsByFacility).map(([facilityName, trips]) => (
                          <div key={facilityName} className="bg-white rounded-lg p-3 border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2 text-sm">{facilityName}</h4>
                            <div className="space-y-2">
                              {trips.slice(0, 3).map((trip) => {
                                const clientName = trip.managed_client 
                                  ? (trip.managed_client.first_name && trip.managed_client.last_name
                                      ? `${trip.managed_client.first_name} ${trip.managed_client.last_name}`
                                      : trip.managed_client.email || 'Managed Client')
                                  : 'Facility Client';
                                
                                return (
                                  <div key={trip.id} className="flex justify-between items-start text-xs">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{clientName}</div>
                                      <div className="text-gray-600 truncate max-w-[200px]">
                                        {trip.pickup_address?.substring(0, 25)}...
                                      </div>
                                      <div className="text-gray-500">
                                        {trip.pickup_time ? formatDate(trip.pickup_time) : formatDate(trip.created_at)}
                                      </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                                      trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      trip.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      trip.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {trip.status}
                                    </span>
                                  </div>
                                );
                              })}
                              {trips.length > 3 && (
                                <div className="text-center pt-2">
                                  <span className="text-xs text-blue-600">+{trips.length - 3} more trips</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Individual Trips Section */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">Individual Trips</h3>
                  </div>
                  
                  {(() => {
                    const individualTrips = recentTrips.filter(trip => trip.user_id && !trip.facility_id);
                    
                    if (individualTrips.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <svg className="w-12 h-12 text-green-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-green-600 text-sm">No recent individual trips</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {individualTrips.slice(0, 5).map((trip) => {
                          const clientName = trip.user_profile?.full_name || 
                            (trip.user_profile?.first_name && trip.user_profile?.last_name 
                              ? `${trip.user_profile.first_name} ${trip.user_profile.last_name}` 
                              : trip.user_profile?.email || 'Individual Client');
                          
                          return (
                            <div key={trip.id} className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">{clientName}</div>
                                  <div className="text-gray-600 text-xs truncate max-w-[200px]">
                                    {trip.pickup_address?.substring(0, 30)}...
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    {trip.pickup_time ? formatDate(trip.pickup_time) : formatDate(trip.created_at)}
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                                  trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  trip.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  trip.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {trip.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {individualTrips.length > 5 && (
                          <div className="text-center pt-2">
                            <span className="text-xs text-green-600">+{individualTrips.length - 5} more trips</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Recent Trips</h3>
                <p className="text-gray-500">Recent trips will appear here once they are created.</p>
              </div>
            )}
          </div>
          
          {/* Pending Driver Verifications - Moved to full width below */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Pending Driver Verifications</h2>
            {pendingDrivers && pendingDrivers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingDrivers.map((driver) => (
                  <div key={driver.id} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{driver.full_name || 'Unknown Driver'}</h4>
                        <p className="text-sm text-gray-600 truncate">{driver.email || 'No email'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Applied: {driver.created_at ? formatDate(driver.created_at) : 'Unknown date'}
                        </p>
                        <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          Pending Verification
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500">No pending driver verifications</p>
              </div>
            )}
            {pendingDrivers && pendingDrivers.length > 0 && (
              <div className="mt-6 text-center">
                <Link href="/drivers?status=pending_verification" className="text-[#84CED3] hover:text-[#70B8BD] transition-colors text-sm font-medium">
                  View all pending verifications →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}