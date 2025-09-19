import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes that don't require authentication
  const publicRoutes = ['/sign-in', '/forgot-password'];

  // Admin-only routes that require Admin role
  const adminOnlyRoutes = [
    '/settings/manage-staff',
    '/reports',
    '/inventory/suppliers',
    '/inventory/adjustments',
    '/inventory/purchase-order',
  ];

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Check if current path is an admin-only route (starts with any admin-only prefix)
  const isAdminOnlyRoute = adminOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // All routes under (root) should be protected except public routes
  const isProtectedRoute =
    pathname.startsWith('/') && !isPublicRoute && !pathname.startsWith('/api');

  // Utility to clear stale refresh token cookie
  const clearRt = () => {
    const res = NextResponse.redirect(new URL('/sign-in', req.url));
    res.cookies.set({ name: 'rt', value: '', path: '/', maxAge: 0 });
    return res;
  };

  // If trying to access protected route without authentication: clear stale refresh cookie if present
  if (isProtectedRoute && !isAuthenticated) {
    return clearRt();
  }

  // If trying to access admin-only route without admin role
  if (isAuthenticated && isAdminOnlyRoute && userRole !== 'Admin') {
    // Determine a contextual safe destination and reason
    const target = pathname.startsWith('/reports')
      ? '/dashboard?denied=reports'
      : pathname.startsWith('/settings/manage-staff')
      ? '/dashboard?denied=staff'
      : '/inventory/products?denied=inventory';
    return NextResponse.redirect(new URL(target, req.url));
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If hitting auth page while unauthenticated: ensure no stale refresh cookie
  if (!isAuthenticated && isPublicRoute) {
    const res = NextResponse.next();
    res.cookies.set({ name: 'rt', value: '', path: '/', maxAge: 0 });
    return res;
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
