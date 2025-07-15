'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import Image from 'next/image';
import ThemeSwitcher from './ThemeSwitcher';
import { signOut } from '@/app/auth/actions';

export default function AdminHeader() {
  const { user, userProfile } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
        <div className="flex items-center space-x-4">
          <Image src="/LOGO2 (1).webp" alt="Logo" width={80} height={80} />
          <div className="bg-[#84CED3] text-white px-2 py-1 rounded text-xs font-medium">
            Admin
          </div>
        </div>
        
        {user && (
          <nav className="flex-1 mx-12">
            <ul className="hidden lg:flex justify-center space-x-4">
              <li>
                <Link href="/dashboard" className="bg-[#84CED3] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#70B8BD] transition-colors">
                  DASHBOARD
                </Link>
              </li>
              <li>
                <Link href="/clients" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  CLIENTS
                </Link>
              </li>
              <li>
                <Link href="/drivers" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  DRIVERS
                </Link>
              </li>
              <li>
                <Link href="/dispatchers" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  DISPATCHERS
                </Link>
              </li>
              <li>
                <Link href="/trips" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  TRIPS
                </Link>
              </li>
              <li>
                <Link href="/facilities" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  FACILITIES
                </Link>
              </li>
              <li>
                <Link href="/invoices" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  INVOICES
                </Link>
              </li>
            </ul>
          </nav>
        )}
        
        {user && (
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <span className="text-gray-700 text-sm font-medium whitespace-nowrap">{userProfile?.full_name || user?.email}</span>
              <form action={signOut}>
                <button 
                  type="submit"
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}