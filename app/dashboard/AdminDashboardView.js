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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Trips */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Trips</h2>
            {recentTrips && recentTrips.length > 0 ? (
              <div className="space-y-2">
                {recentTrips.map((trip) => {
                  // Determine client name based on trip type
                  let clientName = 'Unknown Client';
                  
                  if (trip.user_profile) {
                    // Individual booking trip
                    clientName = trip.user_profile.full_name || 
                      (trip.user_profile.first_name && trip.user_profile.last_name 
                        ? `${trip.user_profile.first_name} ${trip.user_profile.last_name}` 
                        : trip.user_profile.email || 'Individual Client');
                  } else if (trip.managed_client) {
                    // Facility managed client trip
                    clientName = trip.managed_client.first_name && trip.managed_client.last_name
                      ? `${trip.managed_client.first_name} ${trip.managed_client.last_name}`
                      : trip.managed_client.email || 'Managed Client';
                    
                    // Add facility name if available
                    if (trip.facility?.name) {
                      clientName += ` (${trip.facility.name})`;
                    }
                  } else if (trip.facility) {
                    // Facility trip without specific client
                    clientName = `Facility: ${trip.facility.name}`;
                  }
                  
                  return (
                    <ActivityItem 
                      key={trip.id}
                      title={`Trip ${trip.id ? trip.id.substring(0, 8) : 'Unknown'}`}
                      description={`${clientName} - ${trip.pickup_address ? trip.pickup_address.substring(0, 30) : 'Unknown'}...`}
                      time={trip.pickup_time ? formatDate(trip.pickup_time) : (trip.created_at ? formatDate(trip.created_at) : 'Unknown date')}
                      status={trip.status || 'unknown'}
                    />
                  );
                })}
                <div className="mt-4 text-center">
                  <Link href="/trips" className="text-[#84CED3] hover:text-[#70B8BD] transition-colors">
                    View all trips
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No recent trips found</p>
            )}
          </div>
          
          {/* Pending Driver Verifications */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Pending Driver Verifications</h2>
            {pendingDrivers && pendingDrivers.length > 0 ? (
              <div className="space-y-2">
                {pendingDrivers.map((driver) => (
                  <ActivityItem 
                    key={driver.id}
                    title={driver.full_name || 'Unknown'}
                    description={`${driver.email || 'No email'} - Awaiting verification`}
                    time={driver.created_at ? formatDate(driver.created_at) : 'Unknown date'}
                    status="pending"
                  />
                ))}
                <div className="mt-4 text-center">
                  <Link href="/drivers?status=pending_verification" className="text-[#84CED3] hover:text-[#70B8BD] transition-colors">
                    View all pending verifications
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No pending driver verifications</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}