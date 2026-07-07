import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  console.log("MIDDLEWARE RAN FOR:", request.nextUrl.pathname);
  console.log("COOKIE FOUND:", token ? "YES" : "NO");

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      // No token found, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Prevent logged-in users from accessing the login page
  if (request.nextUrl.pathname === '/login' && token) {
    const searchUrl = new URL('/search', request.url);
    return NextResponse.redirect(searchUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
