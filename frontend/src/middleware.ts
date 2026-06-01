import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REDIRECTS: Record<string, string> = {
  '/': '/central',
  '/dashboard': '/central',
  '/home': '/central',
  '/index': '/central',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (REDIRECTS[pathname]) {
    const url = request.nextUrl.clone();
    url.pathname = REDIRECTS[pathname];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
