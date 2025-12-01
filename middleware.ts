import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes that don't require authentication
  const publicRoutes = ['/sign-in', '/forgot-password', '/reset-password'];

  // Admin-only routes that require Admin role
  const adminOnlyRoutes = [
    '/settings/manage-staff',
    '/reports',
    '/inventory/suppliers',
    '/inventory/adjustments',
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

  const res = NextResponse.next();

  // Security Headers (adjust CSP domains as needed for external resources)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // tighten if no inline/eval needed
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'gyroscope=()',
      'accelerometer=()',
      'fullscreen=(self)',
      'payment=()',
    ].join(', '),
  );
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-DNS-Prefetch-Control', 'on');

  return res;
});

export const config = {
  matcher: [
    // Match all request paths except for:
    // - api (API routes)
    // - _next (Next.js internals, including server actions endpoints)
    // - favicon.ico (favicon file)
    '/((?!api|_next|favicon.ico).*)',
  ],
};
