import { createClient } from '@supabase/supabase-js';

let supabaseAdmin = null;

// Only initialize if environment variables are available
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch (error) {
    console.warn('Error initializing Supabase admin client:', error);
  }
}

export { supabaseAdmin };