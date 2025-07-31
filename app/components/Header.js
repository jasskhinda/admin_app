'use client';

import Link from 'next/link';
// ThemeSwitcher removed as requested
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const [user, setUser] = useState(null);
  const supabase = createClient();
  const router = useRouter();
  
  useEffect(() => {
    // Check for current session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    getSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 bg-brand-background border-b border-brand-border">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center">
            <img 
              src="/cctlogo.png" 
              alt="Compassionate Care Transportation" 
              style={{ height: '60px', width: 'auto' }}
              className="object-contain"
            />
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex-1 flex items-center justify-center space-x-6 mx-8">
          <Link 
            href="/dashboard" 
            className={`text-sm font-medium hover:text-brand-accent transition-colors pb-1 ${
              pathname === '/dashboard' ? 'text-brand-accent border-b-2 border-brand-accent' : ''
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/trips/new" 
            className={`text-sm font-medium hover:text-brand-accent transition-colors pb-1 ${
              pathname.includes('/trips/new') ? 'text-brand-accent border-b-2 border-brand-accent' : ''
            }`}
          >
            New Trip
          </Link>
          <Link 
            href="/calendar" 
            className={`text-sm font-medium hover:text-brand-accent transition-colors pb-1 ${
              pathname.includes('/calendar') ? 'text-brand-accent border-b-2 border-brand-accent' : ''
            }`}
          >
            Calendar
          </Link>
          <Link 
            href="/drivers" 
            className={`text-sm font-medium hover:text-brand-accent transition-colors pb-1 ${
              pathname.includes('/drivers') ? 'text-brand-accent border-b-2 border-brand-accent' : ''
            }`}
          >
            Drivers
          </Link>
          <Link 
            href="/clients" 
            className={`text-sm font-medium hover:text-brand-accent transition-colors pb-1 ${
              pathname.includes('/clients') ? 'text-brand-accent border-b-2 border-brand-accent' : ''
            }`}
          >
            Clients
          </Link>
          <Link 
            href="/map" 
            className={`text-sm font-medium hover:text-brand-accent transition-colors pb-1 ${
              pathname.includes('/map') ? 'text-brand-accent border-b-2 border-brand-accent' : ''
            }`}
          >
            Map
          </Link>
        </div>
        
        {/* User Info and Sign Out */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm hidden md:inline-block">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1 rounded text-sm bg-brand-accent text-brand-buttonText hover:opacity-90 transition-opacity"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}