import { createMcpHandler } from "mcp-handler";
import { registerPrayerTools } from "@/lib/mcp/register-prayer-tools";
import {
  checkSharedRateLimit,
  rateLimitHeaders,
  retryAfterSeconds,
} from "@/lib/request-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const handler = createMcpHandler(
  (server) => {
    registerPrayerTools(server);
  },
  {
    serverInfo: {
      name: "sheffield-masjids",
      version: "1.0.0",
    },
    instructions:
      "Sheffield Masjids provides published mosque prayer times. Call search_mosques to resolve a mosque, then get_prayer_times with the slug and optional YYYY-MM-DD date. Report adhan and iqamah separately with the returned date and timezone (Europe/London). Ask which mosque when the user wants iqamah without naming one.",
  },
);

async function withRateLimit(request: Request): Promise<Response> {
  const rate = await checkSharedRateLimit({
    scope: "mcp",
    headers: request.headers,
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const limitHeaders = rateLimitHeaders(RATE_LIMIT, rate);
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in one minute." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfterSeconds(rate.resetAt),
          ...limitHeaders,
        },
      },
    );
  }

  const response = await handler(request);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(limitHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { withRateLimit as GET, withRateLimit as POST, withRateLimit as DELETE };
