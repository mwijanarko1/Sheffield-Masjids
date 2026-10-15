import { createMcpHandler } from "mcp-handler";
import { registerPrayerTools } from "@/lib/mcp/register-prayer-tools";
import { checkRequestRateLimit } from "@/lib/request-rate-limit";

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

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function withRateLimit(request: Request): Promise<Response> {
  const rate = checkRequestRateLimit(clientKey(request), RATE_LIMIT, RATE_WINDOW_MS);
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in one minute." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "RateLimit-Limit": String(RATE_LIMIT),
          "RateLimit-Remaining": "0",
          "RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
        },
      },
    );
  }

  const response = await handler(request);
  const headers = new Headers(response.headers);
  headers.set("RateLimit-Limit", String(RATE_LIMIT));
  headers.set("RateLimit-Remaining", String(rate.remaining));
  headers.set("RateLimit-Reset", String(Math.ceil(rate.resetAt / 1000)));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { withRateLimit as GET, withRateLimit as POST, withRateLimit as DELETE };
