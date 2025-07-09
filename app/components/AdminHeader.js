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
      <div className="container mx-auto flex justify-between items-center px-4 py-2">
        <div className="flex items-center space-x-3">
          <Image src="/LOGO2 (1).webp" alt="Logo" width={60} height={60} />
          <div className="bg-[#84CED3] text-white px-3 py-1 rounded-lg text-sm font-medium">
            Admin
          </div>
        </div>
        
        {user && (
          <nav>
            <ul className="hidden md:flex space-x-2">
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
                <Link href="/facilities" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  FACILITIES
                </Link>
              </li>
              <li>
                <Link href="/invoices" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  INVOICES
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  PROFILE
                </Link>
              </li>
            </ul>
          </nav>
        )}
        
        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="mr-4 text-gray-700 text-sm">{userProfile?.full_name || user?.email}</span>
              <form action={signOut}>
                <button 
                  type="submit"
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
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