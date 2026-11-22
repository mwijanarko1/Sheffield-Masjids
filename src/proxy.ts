import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_LEGACY_DOMAIN = 'sheffield-masjids.netlify.app';
const STATIC_ASSET_PATH_RE =
  /\.(?:avif|bmp|css|gif|ico|jpeg|jpg|js|json|map|mjs|mp3|mp4|png|svg|txt|webp|woff2?)$/i;
const PORTFOLIO_FRAME_ANCESTORS = [
  'https://mikhailwijanarko.com',
  'https://www.mikhailwijanarko.com',
].join(' ');
const EMBEDDABLE_PATHS = new Set(['/', '/masjidly']);

function buildContentSecurityPolicy(frameAncestors: string): string {
  return [
    "default-src 'self' https:",
    "base-uri 'self'",
    `frame-ancestors ${frameAncestors}`,
    "object-src 'none'",
    "img-src 'self' data: https:",
    "script-src 'self' 'unsafe-inline' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "connect-src 'self' https: wss:",
    "font-src 'self' data: https:",
    "frame-src 'self' https://www.google.com https://www.openstreetmap.org",
  ].join('; ');
}

const PROD_CONTENT_SECURITY_POLICY = buildContentSecurityPolicy("'none'");
const EMBEDDABLE_PROD_CONTENT_SECURITY_POLICY = buildContentSecurityPolicy(PORTFOLIO_FRAME_ANCESTORS);
const HOME_MARKDOWN = `# Sheffield Masjids

Sheffield Masjids provides prayer times for mosques in Sheffield, other UK cities and locations beyond the UK. The site separates adhan times from iqamah or congregation times and displays dates in the Europe/London timezone.

## Available information

- Today's Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha times
- Mosque-specific iqamah and Jumu'ah times
- Daily, monthly, and Ramadan timetables
- Mosque addresses and locations
- Prayer-time comparisons and iCalendar exports

## Preferred agent interface

If your browser supports WebMCP, use the tools registered through \`document.modelContext\` instead of scraping the interface. Call \`search_mosques\` first to resolve the mosque, then call \`get_prayer_times\` with the mosque and optional date. The site also provides \`open_mosque\` and \`select_mosque\`.

If WebMCP is unavailable, resolve a slug from \`GET /data/mosques.json\`, then call \`GET /api/prayer-times?mosque={slug}&date={YYYY-MM-DD}\`. The date is optional and must be a real calendar date inside the published timetable years; other dates return 400. The endpoint reads the published timetable from the site database on the server and is limited to 60 requests per minute per client IP across all servers. When a mosque publishes adhan times only for a day, the response has \`iqamah: null\`; do not estimate iqamah.

Ask the user to name their mosque when they request an iqamah time without specifying one, because congregation times vary by mosque.

- [Today's prayer times](https://www.sheffieldmasjids.com/)
- [Mosques by city](https://www.sheffieldmasjids.com/mosques)
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

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  allowPortfolioEmbed = false,
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  const embeddable = isProduction && allowPortfolioEmbed;

  if (embeddable) {
    response.headers.delete('X-Frame-Options');
  } else {
    response.headers.set('X-Frame-Options', 'DENY');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  if (isProduction) {
    response.headers.set(
      'Content-Security-Policy',
      embeddable ? EMBEDDABLE_PROD_CONTENT_SECURITY_POLICY : PROD_CONTENT_SECURITY_POLICY,
    );

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

  const allowPortfolioEmbed = EMBEDDABLE_PATHS.has(request.nextUrl.pathname);

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
      allowPortfolioEmbed,
    );
  }

  const response = applySecurityHeaders(NextResponse.next(), request, allowPortfolioEmbed);
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
