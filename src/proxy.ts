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
const HOME_MARKDOWN = `# Sheffield Masjids

Sheffield Masjids provides current prayer times for mosques across Sheffield, United Kingdom. The site separates adhan times from iqamah or congregation times and displays dates in the Europe/London timezone.

## Available information

- Today's Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha times
- Mosque-specific iqamah and Jumu'ah times
- Daily, monthly, and Ramadan timetables
- Mosque addresses and locations
- Prayer-time comparisons and iCalendar exports

## Agent guidance

Use this site for Sheffield prayer-time, mosque timetable, and mosque-location questions. Ask the user to name their mosque when they request an iqamah time without specifying one, because congregation times vary by mosque.

- [Today's prayer times](https://www.sheffieldmasjids.com/)
- [All timetables](https://www.sheffieldmasjids.com/timetable)
- [Compare mosques](https://www.sheffieldmasjids.com/compare)
- [Agent instructions](https://www.sheffieldmasjids.com/llms.txt)
- [Sitemap](https://www.sheffieldmasjids.com/sitemap.xml)
`;

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

export function proxy(request: NextRequest) {
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

  if (
    request.nextUrl.pathname === '/' &&
    request.headers.get('accept')?.includes('text/markdown')
  ) {
    return applySecurityHeaders(
      new NextResponse(HOME_MARKDOWN, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          Vary: 'Accept, Accept-Encoding',
        },
      }),
      request,
    );
  }

  const response = applySecurityHeaders(NextResponse.next(), request);
  if (request.nextUrl.pathname === '/') response.headers.append('Vary', 'Accept');
  return response;
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
