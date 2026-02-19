import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_LEGACY_DOMAIN = 'sheffield-masjids.netlify.app';
const STATIC_ASSET_PATH_RE =
  /\.(?:avif|bmp|css|gif|ico|jpeg|jpg|js|json|map|mjs|mp3|mp4|png|svg|txt|webp|woff2?)$/i;
const PROD_CONTENT_SECURITY_POLICY = [
  "default-src 'self' https:",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "connect-src 'self' https: wss:",
  "font-src 'self' data: https:",
  "frame-src 'self' https://www.google.com https://www.openstreetmap.org",
].join('; ');

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', PROD_CONTENT_SECURITY_POLICY);

    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const isHttps = forwardedProto === 'https' || request.nextUrl.protocol === 'https:';
    if (isHttps) {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  }

  return response;
}

export function middleware(request: NextRequest) {
  const hostname = normalizeDomain(request.nextUrl.hostname);
  const legacyDomain = normalizeDomain(
    process.env.NEXT_PUBLIC_LEGACY_NETLIFY_DOMAIN ?? DEFAULT_LEGACY_DOMAIN,
  );
  const isLegacyHost = hostname === legacyDomain || hostname === `www.${legacyDomain}`;

  if (isLegacyHost) {
    const { pathname } = request.nextUrl;

    if (
      pathname !== '/new-domain' &&
      !pathname.startsWith('/_next') &&
      !STATIC_ASSET_PATH_RE.test(pathname)
    ) {
      return applySecurityHeaders(NextResponse.rewrite(new URL('/new-domain', request.url)), request);
    }
  }

  return applySecurityHeaders(NextResponse.next(), request);
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
