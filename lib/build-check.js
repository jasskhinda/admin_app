// Build time check to ensure environment variables are available
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

export function checkBuildEnvironment() {
  // During build time, skip environment checks
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    console.log('Local production build - skipping environment checks');
    return true;
  }
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

export function isBuildTime() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}