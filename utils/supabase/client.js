import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables for client')
    // Return a minimal client that won't crash
    return {
      auth: { getUser: () => ({ data: { user: null }, error: null }) },
      from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }) })
    }
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}