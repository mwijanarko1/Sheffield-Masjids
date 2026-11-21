// HTTP E2E smoke test for Node, a local Workers preview, or workers.dev.
// No app imports or credentials required. Use a production build, not next dev.
const base = new URL(process.env.BASE_URL || 'http://localhost:3000');
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('BASE_URL must be an HTTP(S) URL without credentials.');
}
const slug = 'madina-masjid-sheffield';
const mosqueName = 'Madina Masjid Sheffield';
// Fixed published date avoids missing future months and Ramadan overrides.
const date = '2026-01-01';
const query = `mosque=${slug}&month=1&year=2026`;
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
let passed = 0;
let failed = 0;
let skipped = 0;
let evidence = [];

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function redact(body) {
  return body
    .replace(/(["']?(?:[\w-]*(?:token|secret|password|authorization|cookie)[\w-]*)["']?\s*[:=]\s*)[^\s,}<]+/gi, '$1[redacted]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email redacted]')
    .replace(/[A-Za-z0-9_+/=-]{40,}/g, '[long value redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

async function request(path, options = {}) {
  const response = await fetch(new URL(path, base), {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  // Retain bounded, redacted evidence before any JSON parsing. Never log tokens.
  const contentType = response.headers.get('content-type') || '';
  evidence.push({
    status: response.status,
    contentType,
    body: path.startsWith('/.well-known/openai-apps-challenge')
      ? '[challenge body withheld]'
      : redact(body),
  });
  return { response, body, contentType };
}

function json(result) {
  expect(result.contentType.includes('application/json'), 'expected application/json');
  return JSON.parse(result.body);
}

function status(result, expected) {
  expect(result.response.status === expected, `expected HTTP ${expected}, got ${result.response.status}`);
}

function decodeEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
    if (!code.startsWith('#')) return named[code.toLowerCase()];
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  });
}

function visibleText(html) {
  // Read server-rendered body only. Ignore scripts, metadata, SVG, templates,
  // hidden and aria-hidden subtrees so hydration payloads cannot satisfy checks.
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  const tokens = body.match(/<!--[\s\S]*?-->|<(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+/g) || [];
  const stack = [];
  const text = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;
    if (!token.startsWith('<')) {
      if (!stack.some((entry) => entry.hidden)) text.push(token);
      continue;
    }
    const tag = token.match(/^<\/?([\w-]+)/)?.[1]?.toLowerCase();
    if (!tag) continue;
    if (token.startsWith('</')) {
      const index = stack.findLastIndex((entry) => entry.tag === tag);
      if (index !== -1) stack.length = index;
    } else if (!voidTags.has(tag) && !token.endsWith('/>')) {
      const classes = (token.match(/\sclass\s*=\s*["']([^"']*)["']/i)?.[1] || '').split(/\s+/);
      const hidden = ['script', 'style', 'template', 'noscript', 'svg'].includes(tag)
        || /\saria-hidden\s*=\s*(?:"true"|'true'|true)(?=\s|\/?>)/i.test(token)
        || /\shidden(?:\s|=|\/?>)/i.test(token)
        || classes.includes('sr-only') || classes.includes('hidden');
      stack.push({ tag, hidden });
    }
  }
  return decodeEntities(text.join(' ')).replace(/\s+/g, ' ').trim();
}

async function check(name, run) {
  evidence = [];
  try {
    const detail = await run();
    passed++;
    console.log(`PASS ${name}${detail ? `: ${detail}` : ''}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}: ${redact(error.message)}; responses=${JSON.stringify(evidence)}`);
  }
}

function security(result) {
  const headers = result.response.headers;
  for (const [name, value] of [
    ['x-frame-options', 'DENY'],
    ['x-content-type-options', 'nosniff'],
    ['referrer-policy', 'strict-origin-when-cross-origin'],
    ['permissions-policy', 'camera=(), microphone=(), geolocation=(self)'],
  ]) expect(headers.get(name) === value, `missing or incorrect ${name}`);
  const csp = headers.get('content-security-policy') || '';
  for (const directive of ["default-src 'self' https:", "frame-ancestors 'none'", "object-src 'none'", "connect-src 'self' https: wss:"]) {
    expect(csp.split(';').map((value) => value.trim()).includes(directive), `missing CSP directive: ${directive}`);
  }
  if (base.protocol === 'https:') {
    expect(headers.get('strict-transport-security') === 'max-age=31536000; includeSubDomains; preload', 'missing production HTTPS HSTS');
  }
}

for (const [path, texts] of [
  ['/', ['Fajr']],
  ['/mosques', ['Mosques and prayer times by city', 'Sheffield']],
  [`/mosques/${slug}`, [`${mosqueName} Prayer Times in Sheffield`]],
  [`/mosques/${slug}/timetable`, [mosqueName, 'Full monthly timetable']],
  ['/timetable', ['Loading your saved mosque...']],
  ['/compare', ['Mosque Comparison']],
  ['/about', ['About Sheffield Masjids', 'How the timetable works']],
  ['/privacy', ['Privacy Policy', 'Data We Collect']],
  ['/cities/gb/sheffield', ['Sheffield mosques and prayer times', mosqueName]],
  ['/masjidly', ['Official Masjid timetables.']],
]) {
  await check(`HTML ${path} + Cookie regression`, async () => {
    const normal = await request(path, { headers: { Accept: 'text/html' } });
    const cookie = await request(path, { headers: { Accept: 'text/html', Cookie: 'a=b' } });
    status(normal, 200);
    expect(cookie.response.status === normal.response.status, `Cookie changed HTTP ${normal.response.status} to ${cookie.response.status}`);
    for (const result of [normal, cookie]) {
      expect(result.contentType.includes('text/html'), 'expected text/html');
      const text = visibleText(result.body);
      for (const expected of texts) expect(text.includes(expected), `missing visible text: ${expected}`);
    }
    if (path === '/') {
      security(normal);
      security(cookie);
      expect(normal.response.headers.get('vary')?.toLowerCase().includes('accept'), 'home must Vary on Accept');
    }
    return 'HTTP 200 with and without Cookie';
  });
}

await check('home Markdown proxy + Cookie regression', async () => {
  for (const headers of [{ Accept: 'text/markdown' }, { Accept: 'text/markdown', Cookie: 'a=b' }]) {
    const result = await request('/', { headers });
    status(result, 200);
    expect(result.contentType.includes('text/markdown'), 'expected text/markdown');
    expect(result.body.startsWith('# Sheffield Masjids\n'), 'missing Markdown heading');
    expect(result.body.includes('## Preferred agent interface'), 'missing agent instructions');
    expect(result.response.headers.get('vary')?.toLowerCase().includes('accept'), 'Markdown must Vary on Accept');
    security(result);
  }
  return 'HTTP 200 with and without Cookie';
});

await check('robots.txt', async () => {
  const result = await request('/robots.txt');
  status(result, 200);
  expect(result.contentType.includes('text/plain'), 'expected text/plain');
  for (const line of [/^User-Agent: \*$/im, /^Allow: \/$/im, /^Sitemap: https?:\/\/[^\s]+\/sitemap\.xml$/im]) {
    expect(line.test(result.body), `missing robots directive ${line}`);
  }
  return 'HTTP 200';
});

await check('sitemap.xml', async () => {
  const result = await request('/sitemap.xml');
  status(result, 200);
  expect(result.contentType.includes('xml'), 'expected XML');
  expect(result.body.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'missing sitemap namespace');
  for (const path of ['/about', '/mosques', `/mosques/${slug}`, '/cities/gb/sheffield']) {
    expect(result.body.includes(`${path}</loc>`), `missing sitemap URL ${path}`);
  }
  return 'HTTP 200';
});

let published;
await check('prayer-times JSON', async () => {
  const result = await request(`/api/prayer-times?mosque=${slug}&date=${date}`);
  status(result, 200);
  const data = json(result);
  expect(data.mosque?.slug === slug && data.mosque?.name === mosqueName, 'incorrect mosque identity');
  expect(data.date === date && data.timezone === 'Europe/London', 'incorrect date or timezone');
  expect(['convex', 'published-static-data'].includes(data.source), 'unknown prayer-time source');
  for (const field of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    expect(clock.test(data.adhan?.[field]), `missing or invalid adhan.${field}`);
  }
  expect(data.adhan.fajr === '06:15' && data.adhan.dhuhr === '12:12', 'incorrect published January 1 adhan fixture');
  expect(clock.test(data.iqamah?.fajr) && clock.test(data.iqamah?.isha), 'missing real iqamah times');
  expect(data.iqamah.fajr === '07:30' && data.iqamah.isha === '18:45', 'incorrect published January 1 iqamah fixture');
  published = data;
  return `HTTP 200, ${data.source}, ${date}`;
});

await check('timetable JSON', async () => {
  const result = await request(`/api/timetable?${query}`);
  status(result, 200);
  const data = json(result);
  expect(data.monthly?.month === 'JANUARY', 'expected JANUARY timetable');
  expect(data.monthly.prayer_times?.length === 31, 'expected 31 January days');
  const first = data.monthly.prayer_times.find((row) => row.date === 1);
  expect(first?.fajr === '06:15' && first?.dhuhr === '12:12', 'incorrect published January 1 timetable fixture');
  for (const field of ['fajr', 'shurooq', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    expect(clock.test(first?.[field]), `missing or invalid prayer_times[day=1].${field}`);
    if (published) expect(first[field] === published.adhan[field === 'shurooq' ? 'sunrise' : field], `feeds disagree on ${field}`);
  }
  expect(data.monthly.iqamah_times?.length > 0 && clock.test(data.monthly.jummah_iqamah), 'missing iqamah or Jumuah');
  return 'HTTP 200, JANUARY, 31 days';
});

await check('calendar-feed ICS', async () => {
  const result = await request(`/api/calendar-feed?${query}&range=month&mode=adhan`);
  status(result, 200);
  expect(result.contentType.includes('text/calendar'), 'expected text/calendar');
  const calendar = result.body.replace(/\r?\n[ \t]/g, '');
  for (const text of ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'DTSTART;TZID=Europe/London:20260101T', `${mosqueName} Prayer Times - January 2026`, 'END:VCALENDAR']) {
    expect(calendar.includes(text), `missing calendar content: ${text}`);
  }
  return 'HTTP 200, text/calendar with January events';
});

await check('MCP initialize via /mcp rewrite', async () => {
  const result = await request('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'site-http-smoke', version: '1.0.0' } } }),
  });
  status(result, 200);
  // MCP streamable HTTP may negotiate JSON or an SSE-framed JSON-RPC result.
  let messages;
  if (result.contentType.includes('text/event-stream')) {
    messages = result.body.split(/\r?\n\r?\n/).filter((event) => /^data:/m.test(event)).map((event) => JSON.parse(event.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')));
  } else messages = [json(result)];
  const message = messages.find((item) => item.id === 1);
  expect(message?.jsonrpc === '2.0' && !message.error, 'missing successful JSON-RPC result');
  expect(message.result?.serverInfo?.name === 'sheffield-masjids', 'incorrect MCP server name');
  expect(message.result?.serverInfo?.version === '1.0.0', 'incorrect MCP server version');
  expect(['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'].includes(message.result?.protocolVersion), 'invalid negotiated MCP protocol');
  expect(message.result?.capabilities?.tools, 'MCP must advertise tools');
  return 'HTTP 200, JSON-RPC initialize result';
});

await check('OpenAI challenge (no secret required)', async () => {
  const result = await request('/.well-known/openai-apps-challenge');
  expect(result.contentType.includes('text/plain'), 'expected text/plain');
  if (result.response.status === 404) {
    expect(result.body === 'OpenAI apps challenge token is not configured.', 'incorrect unconfigured challenge response');
    return 'HTTP 404, documented unconfigured response';
  }
  status(result, 200);
  expect(result.response.headers.get('cache-control') === 'no-store', 'configured challenge must not be cached');
  expect(result.body.length > 0 && result.body === result.body.trim() && !/[\r\n<>]/.test(result.body), 'configured challenge must be a nonempty plain token');
  return 'HTTP 200, configured token withheld (exact value not checked without secret)';
});

await check('unknown path', async () => {
  const result = await request('/__site_smoke_missing_223__');
  status(result, 404);
  return 'HTTP 404';
});

await check('feedback rejects invalid submission without credentials', async () => {
  // The public endpoint does not authenticate callers. The intake secret is
  // server-side only. An invalid report cannot create a stored submission.
  const result = await request('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const data = json(result);
  const unavailable = {
    intake_unavailable: 'Feedback intake is not available.',
    intake_disabled: 'Feedback intake is temporarily disabled.',
    limiter_unavailable: 'Feedback intake is temporarily unavailable.',
  };
  if (result.response.status === 503) {
    expect(data.error === unavailable[data.code], 'incorrect unavailable rejection');
    expect(Number(result.response.headers.get('retry-after')) > 0, 'unavailable intake must provide Retry-After');
  } else {
    status(result, 422);
    expect(data.code === 'invalid_report', 'expected invalid_report rejection');
    expect(data.error === 'Report does not match schema version 1. See GET /api/feedback for the contract.', 'incorrect invalid report message');
  }
  expect(result.response.headers.get('cache-control') === 'no-store', 'feedback rejection must not be cached');
  return `HTTP ${result.response.status}, ${data.code}`;
});

const legacy = new URL(`https://${process.env.NEXT_PUBLIC_LEGACY_NETLIFY_DOMAIN || 'sheffield-masjids.netlify.app'}`).hostname;
if ([legacy, `www.${legacy}`].includes(base.hostname)) {
  await check('legacy host rewrite', async () => {
    const result = await request('/about', { headers: { Accept: 'text/html' } });
    status(result, 200);
    expect(visibleText(result.body).includes('Sheffield Masjids has moved to a more permanent home.'), 'legacy host did not rewrite to new-domain');
    security(result);
    return 'HTTP 200, New Domain';
  });
} else {
  skipped++;
  console.log('SKIP legacy host rewrite: BASE_URL is not the legacy domain; synthetic Host does not reliably change NextRequest.nextUrl.hostname');
}

// Run last: this check deliberately exhausts the prayer-times rate limit.
if (process.env.EXPECT_TRUSTED_CLIENT_IP === '1') {
  await check('trusted client IP resists forged forwarding headers', async () => {
    let firstLimited;
    for (let attempt = 1; attempt <= 75; attempt++) {
      const forgedIp = `192.0.2.${attempt}`;
      const result = await request(`/api/prayer-times?mosque=${slug}&date=${date}`, {
        headers: { 'X-Forwarded-For': forgedIp, 'X-Real-IP': forgedIp },
      });
      expect(result.response.status !== 500, `request ${attempt} returned HTTP 500`);
      expect([200, 429].includes(result.response.status), `request ${attempt}: expected HTTP 200 or 429, got ${result.response.status}`);
      if (result.response.status === 429) {
        firstLimited ??= attempt;
        expect(json(result).error === 'Rate limit exceeded. Try again in one minute.', 'incorrect rate-limit error');
        expect(result.response.headers.get('ratelimit-limit') === '60', 'expected 60 requests per minute');
        expect(result.response.headers.get('ratelimit-remaining') === '0', 'limited response must have zero remaining requests');
        expect(Number(result.response.headers.get('retry-after')) > 0, 'limited response must provide Retry-After');
      }
    }
    expect(firstLimited !== undefined, 'all 75 requests were allowed despite rotating forged X-Forwarded-For and X-Real-IP; expected HTTP 429 by request 75');
    return `75 sequential requests, first HTTP 429 at request ${firstLimited}, no HTTP 500`;
  });
} else {
  skipped++;
  console.log('SKIP trusted client IP resists forged forwarding headers: set EXPECT_TRUSTED_CLIENT_IP=1 on a trusted platform');
}

console.log(`Smoke: ${passed} passed, ${failed} failed, ${skipped} skipped (${base.origin})`);
process.exitCode = failed ? 1 : 0;
