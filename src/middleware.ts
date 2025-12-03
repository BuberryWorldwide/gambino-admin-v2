// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isValidJWT(token: string): boolean {
  // Basic JWT format validation: header.payload.signature
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    // Try to decode the payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token is expired
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('gambino_token')?.value;

  const publicRoutes = ['/login', '/register', '/onboard'];
  const _isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
  const isAdminRoute = pathname.startsWith('/admin');

  // Allow root to pass through
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Protect admin routes - redirect to login if no token or invalid/expired token
  if (isAdminRoute && (!token || !isValidJWT(token))) {
    // Clear the invalid cookie
    const response = NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url));
    response.cookies.delete('gambino_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};