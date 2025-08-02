import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes that don't require authentication
  const publicRoutes = ['/sign-in', '/forgot-password'];

  // Admin-only routes that require Admin role
  const adminOnlyRoutes = ['/settings/manage-staff'];

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Check if current path is an admin-only route
  const isAdminOnlyRoute = adminOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // All routes under (root) should be protected except public routes
  const isProtectedRoute =
    pathname.startsWith('/') && !isPublicRoute && !pathname.startsWith('/api');

  // If trying to access protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // If trying to access admin-only route without admin role
  if (isAuthenticated && isAdminOnlyRoute && userRole !== 'Admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
