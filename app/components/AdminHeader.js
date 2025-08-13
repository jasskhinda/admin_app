'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/auth/actions';

export default function AdminHeader() {
  const { user, userProfile } = useAuth();
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

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
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  DASHBOARD
                </Link>
              </li>
              <li>
                <Link 
                  href="/clients" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/clients')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  CLIENTS
                </Link>
              </li>
              <li>
                <Link 
                  href="/drivers" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/drivers')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  DRIVERS
                </Link>
              </li>
              <li>
                <Link 
                  href="/dispatchers" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/dispatchers')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  DISPATCHERS
                </Link>
              </li>
              <li>
                <Link 
                  href="/trips" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/trips')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  TRIPS
                </Link>
              </li>
              <li>
                <Link 
                  href="/facilities" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/facilities')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  FACILITIES
                </Link>
              </li>
              <li>
                <Link 
                  href="/calendar" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/calendar')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  CALENDAR
                </Link>
              </li>
              <li>
                <Link 
                  href="/map" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/map')
                      ? 'bg-[#84CED3] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  MAP
                </Link>
              </li>

            </ul>
          </nav>
        )}
        
        {user && (
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <span className="text-gray-700 text-sm font-medium whitespace-nowrap">{userProfile?.full_name || user?.email}</span>
              
              {/* Settings Link */}
              <Link 
                href="/settings" 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/settings')
                    ? 'bg-[#84CED3] text-white'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                SETTINGS
              </Link>
              
              {/* DB CLEANUP - Only for j.khinda@ccgrhc.com */}
              {user?.email === 'j.khinda@ccgrhc.com' && (
                <Link 
                  href="/database-cleanup" 
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/database-cleanup')
                      ? 'bg-red-500 text-white'
                      : 'text-red-500 hover:bg-red-50 border border-red-500'
                  }`}
                >
                  DB CLEANUP
                </Link>
              )}
              
              <form action={signOut}>
                <button 
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors whitespace-nowrap border-2 border-red-600 hover:border-red-700"
                >
                  LOGOUT
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}