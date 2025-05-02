'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Configure Supabase client using auth-helpers-nextjs
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options: {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600'
      },
      fetch: (url, options) => {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 10000);

        return fetch(url, {
          ...options,
          signal: timeoutController.signal,
          cache: 'default',
        }).finally(() => clearTimeout(timeoutId));
      }
    },
    db: {
      schema: 'public',
    },
    realtime: {
      timeout: 60000
    }
  }
});