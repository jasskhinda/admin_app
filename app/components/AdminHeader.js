'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import Image from 'next/image';
import ThemeSwitcher from './ThemeSwitcher';
import { signOut } from '@/app/auth/actions';

export default function AdminHeader() {
  const { user, userProfile } = useAuth();

  return (
    <header className="bg-[#3B5B63] dark:bg-[#3B5B63] text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Image src="/favicon.png" alt="Logo" width={36} height={36} />
          <h1 className="text-xl font-bold">Compassionate Rides Admin</h1>
        </div>
        
        {user && (
          <nav>
            <ul className="hidden md:flex space-x-6">
              <li>
                <Link href="/dashboard" className="hover:underline">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/clients" className="hover:underline">
                  Clients
                </Link>
              </li>
              <li>
                <Link href="/drivers" className="hover:underline">
                  Drivers
                </Link>
              </li>
              <li>
                <Link href="/dispatchers" className="hover:underline">
                  Dispatchers
                </Link>
              </li>
              <li>
                <Link href="/invoices" className="hover:underline">
                  Invoices
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:underline">
                  Profile
                </Link>
              </li>
            </ul>
          </nav>
        )}
        
        {user && (
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            <div className="flex items-center">
              <span className="mr-2">{userProfile?.full_name || user?.email}</span>
              <form action={signOut}>
                <button 
                  type="submit"
                  className="p-2 rounded bg-white dark:bg-[#84CED3] text-[#3B5B63] hover:bg-opacity-90"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}