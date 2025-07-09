import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    envVars: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      service: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
    }
  });
}