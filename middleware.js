import { NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Define routes that don't need authentication checks
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/login/actions/login',
  '/login/actions/signup',
  '/auth/callback',
  '/auth/confirm',
  '/api/auth/callback',
  '/error',
  '/favicon.ico'
];

// Check if a path is public or a static resource
const isPublicPath = (path) => {
  return PUBLIC_ROUTES.includes(path) || 
    path.startsWith('/_next/') || 
    path.startsWith('/api/') ||
    path.match(/\.(ico|png|jpg|svg|css|js)$/);
};

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Skip public paths immediately
  if (isPublicPath(path)) {
    return NextResponse.next();
  }
  
  // Update the session
  const response = await updateSession(request);
  
  // Create server client with cookies from the request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // This is handled by updateSession
        },
        remove(name, options) {
          // This is handled by updateSession
        },
      },
    }
  );
  
  try {
    // Always use getUser instead of getSession for security
    const { data: { user } } = await supabase.auth.getUser();
    
    // If already logged in and trying to access login page, redirect to dashboard
    if (user && path === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If no user on a protected route, redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // For protected routes, verify user is an admin
    try {
      // Get profile with a reasonable timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .abortSignal(controller.signal)
        .single();
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.log('MIDDLEWARE: Profile fetch error:', error.message);
        
        // Don't immediately sign out on network errors
        if (error.code === 'PGRST116' || error.code === '20' || error.message.includes('aborted')) {
          console.log('MIDDLEWARE: Allowing access on profile fetch error/timeout');
          return response;
        }
        
        // For other errors like not found, sign out
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login?error=User%20profile%20not%20found', request.url));
      }
      
      if (!profile) {
        console.log('MIDDLEWARE: No profile found');
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login?error=User%20profile%20not%20found', request.url));
      }
      
      // Check if user is an admin or dispatcher
      if (!['admin', 'dispatcher'].includes(profile.role)) {
        console.log("MIDDLEWARE: Not an admin or dispatcher, redirecting to login");
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login?error=Access%20denied.%20Admin%20or%20dispatcher%20access%20required', request.url));
      }
      
      console.log('MIDDLEWARE: Admin/Dispatcher verification successful');
    } catch (err) {
      console.log('MIDDLEWARE: Profile check error:', err.message);
      
      // On timeout or abort, allow access - the server components will verify permissions
      if (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('timeout')) {
        console.log('MIDDLEWARE: Allowing access on timeout/abort');
        return response;
      }
      
      // For other errors, redirect to login
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=Authentication%20error', request.url));
    }
    
    // User is authenticated and has required role, proceed
    console.log("MIDDLEWARE: Access granted for", path);
    return response;
    
  } catch (error) {
    console.error("MIDDLEWARE ERROR:", error);
    // Generic error handler
    return NextResponse.redirect(new URL('/login?error=Authentication%20error', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.png|.*\\.svg).*)',
  ],
};