'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminHeader from '../components/AdminHeader';

// Dashboard card component
function DashboardCard({ title, count, icon, linkHref, linkText, color = 'primary' }) {
  return (
    <div className="bg-white dark:bg-brand-card p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">{title}</h3>
          <p className="text-3xl font-bold mt-2 text-brand-accent">{count}</p>
        </div>
        <div className="p-3 rounded-full bg-opacity-10 bg-brand-accent dark:bg-opacity-20">
          <Image src={icon} alt={title} width={24} height={24} />
        </div>
      </div>
      {linkHref && (
        <div className="mt-4">
          <Link href={linkHref} className="text-brand-accent hover:underline">
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
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-3 last:border-0">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium dark:text-gray-200">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
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
      className="block bg-white dark:bg-brand-card p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start space-x-4">
        <div className="p-3 rounded-full bg-opacity-10 bg-brand-accent dark:bg-opacity-20">
          <Image src={icon} alt={title} width={24} height={24} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
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
    <div className="min-h-screen bg-background dark:bg-gray-900">
      {/* AdminHeader is rendered in layout.js, no need to duplicate it here */}
      
      <main className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Overview</h2>
        
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
          <div className="bg-white dark:bg-brand-card rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Recent Trips</h2>
            {recentTrips && recentTrips.length > 0 ? (
              <div className="space-y-2">
                {recentTrips.map((trip) => (
                  <ActivityItem 
                    key={trip.id}
                    title={`Trip ${trip.id ? trip.id.substring(0, 8) : 'Unknown'}`}
                    description={`${trip.user_id ? trip.user_id.substring(0, 8) : 'Unknown'} - ${trip.pickup_address ? trip.pickup_address.substring(0, 20) : 'Unknown'}...`}
                    time={trip.created_at ? formatDate(trip.created_at) : 'Unknown date'}
                    status={trip.status || 'unknown'}
                  />
                ))}
                <div className="mt-4 text-center">
                  <Link href="/trips" className="text-primary dark:text-secondary hover:underline">
                    View all trips
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No recent trips found</p>
            )}
          </div>
          
          {/* Pending Driver Verifications */}
          <div className="bg-white dark:bg-brand-card rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Pending Driver Verifications</h2>
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
                  <Link href="/drivers?status=pending_verification" className="text-primary dark:text-secondary hover:underline">
                    View all pending verifications
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No pending driver verifications</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}