import { clerkMiddleware, getAuth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { userService } from '@/services/user.service'

const isProtectedRoute = (pathname) => {
  if (!pathname) return false;
  
  const protectedPaths = ['/profile', '/orders', '/dashboard']
  return protectedPaths.some(path => 
    pathname.startsWith(path)
  )
}

export default clerkMiddleware((req) => {
  try {
    // Improved pathname extraction
    const pathname = new URL(req.url).pathname;
    
    // Ignore static files and API routes
    if (pathname.includes('.') || pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return NextResponse.next()
    }

    // Safe and detailed logging
    console.log('Middleware Processing', { 
      method: req.method || 'UNKNOWN',
      fullUrl: req.url || 'UNKNOWN',
      pathname,
      headers: {
        userAgent: req.headers.get('user-agent') || 'UNKNOWN',
        host: req.headers.get('host') || 'UNKNOWN'
      }
    });

    // Get authentication safely
    const { userId } = getAuth(req);

    // Check if the route is protected
    if (isProtectedRoute(pathname)) {
      // Detailed authentication logging
      console.log('Protected Route Authentication', {
        isAuthenticated: !!userId,
        userId
      });

      // Redirect to sign-in if not authenticated
      if (!userId) {
        console.log('Redirecting to sign-in');
        return redirectToSignIn({ 
          returnBackUrl: req.url 
        })
      }

      // Synchronize user in the background
      if (userId) {
        // Use Promise.allSettled to prevent blocking
        Promise.allSettled([
          userService.syncClerkUserToDatabase(userId)
        ]).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`Background sync ${index} failed:`, result.reason);
            }
          });
        });
      }
    }

    return NextResponse.next()
  } catch (error) {
    // Comprehensive error logging
    console.error('Middleware Processing Error', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Always return next to prevent complete middleware failure
    return NextResponse.next()
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static (static files)
     */
    '/((?!_next/static|_next/image|favicon.ico|static).*)',
  ]
}