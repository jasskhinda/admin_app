import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key for privileged operations
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables for admin client')
    console.error('URL:', !!supabaseUrl, 'Service Role Key:', !!supabaseServiceRoleKey)
    throw new Error('Missing Supabase environment variables for admin operations')
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}