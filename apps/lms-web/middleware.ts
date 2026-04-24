import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { formatBlockedPilotPath, isPilotPath } from './lib/pilot-routes';

const STATIC_FILE_PATTERN = /\.[^/]+$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next')
    || pathname.startsWith('/api')
    || pathname.startsWith('/favicon')
    || pathname.startsWith('/robots')
    || pathname.startsWith('/sitemap')
    || STATIC_FILE_PATTERN.test(pathname)
    || isPilotPath(pathname)
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('blockedRoute', formatBlockedPilotPath(pathname));

  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/:path*',
};
