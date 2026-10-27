import { ConvexHttpClient } from "convex/browser";

/**
 * Server-side Convex access for the Next.js runtime.
 *
 * Reads `CONVEX_URL` and `CONVEX_READ_SECRET`, which are server-only Vercel
 * env vars (no NEXT_PUBLIC_ prefix), so neither the deployment URL nor the
 * secret is inlined into browser bundles. Never import this from a client
 * component; client code reaches Convex data through our own API routes.
 *
 * Returns null when CONVEX_URL is not set; callers then fall back to the
 * repository JSON (see src/lib/published-prayer-times.ts for why that
 * fallback exists).
 */
export type ServerConvex = {
  client: ConvexHttpClient;
  /** Spread into query args. Empty when no read secret is configured. */
  readArgs: { readSecret?: string };
  readSecret: string | null;
  /**
   * Fresh client whose HTTP requests abort with `signal`. The shared `client`
   * queues mutations and cannot cancel one in flight, so calls that must be
   * independent and abortable (the rate limiter) use this instead.
   */
  clientWithSignal(signal: AbortSignal): ConvexHttpClient;
};

let cached: { key: string; value: ServerConvex } | null = null;

export function getServerConvex(env: Record<string, string | undefined> = process.env): ServerConvex | null {
  const url = env.CONVEX_URL?.trim();
  if (!url) return null;
  const readSecret = env.CONVEX_READ_SECRET?.trim() || null;
  const key = `${url}\u0000${readSecret ?? ""}`;
  if (cached?.key === key) return cached.value;

  const value: ServerConvex = {
    client: new ConvexHttpClient(url),
    readArgs: readSecret ? { readSecret } : {},
    readSecret,
    clientWithSignal: (signal) =>
      new ConvexHttpClient(url, { fetch: (input, init) => fetch(input, { ...init, signal }) }),
  };
  cached = { key, value };
  return value;
}
