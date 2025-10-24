// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  
  // Protect admin routes - redirect to login if no token
  if (isAdminRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};