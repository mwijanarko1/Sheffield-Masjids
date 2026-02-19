import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // The old Netlify domain
  const netlifyDomain = 'sheffield-masjids.netlify.app';

  // If the request is coming from the old Netlify domain
  if (hostname.includes(netlifyDomain)) {
    const { pathname } = request.nextUrl;

    // Rewrite all requests from Netlify to the /new-domain page
    // except if it's already requesting the /new-domain page or static assets
    if (
      pathname !== '/new-domain' && 
      !pathname.startsWith('/_next') && 
      !pathname.includes('.')
    ) {
      return NextResponse.rewrite(new URL('/new-domain', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
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
