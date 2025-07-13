'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import AdminHeader from '@/app/components/AdminHeader';

export default function ClientWrapper({ children }) {
  const { user, loading } = useAuth();

  // Don't render until auth is loaded to prevent flash
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
            <div className="flex items-center space-x-4">
              <img src="/LOGO2 (1).webp" alt="Logo" width="80" height="80" />
              <div className="bg-[#84CED3] text-white px-2 py-1 rounded text-xs font-medium">
                Admin
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 bg-background">
          <div className="flex items-center justify-center h-64">
            <div>Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-1 bg-background">
        {children}
      </main>
    </div>
  );
}