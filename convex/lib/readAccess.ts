/**
 * Read secret guard for Convex queries that only our Next.js server may call.
 *
 * The web runtime holds CONVEX_READ_SECRET; it never holds ADMIN_SECRET.
 * Configure the same value in two places:
 *   - Convex deployment: Settings > Environment Variables > CONVEX_READ_SECRET
 *   - Vercel project (server only, no NEXT_PUBLIC_ prefix): CONVEX_READ_SECRET
 *
 * Two levels:
 *   - requireReadSecret: locked functions. Fails closed when the deployment
 *     has no secret configured or the caller sends a wrong or missing secret.
 *   - checkOptionalReadSecret: functions that must stay public because shipped
 *     clients (the Masjidly iOS and Android apps) call them without a secret.
 *     A missing secret is allowed. A secret that is sent must be correct, so a
 *     misconfigured web server shows up as errors (and the web falls back)
 *     instead of silently looking healthy. This lets the same functions be
 *     locked later by swapping to requireReadSecret once the apps stop calling
 *     Convex directly.
 */

function configuredReadSecret(): string {
  return (process.env.CONVEX_READ_SECRET ?? "").trim();
}

function secretsMatch(provided: string, configured: string): boolean {
  const candidate = provided.trim();
  let diff = candidate.length ^ configured.length;
  for (let i = 0; i < configured.length; i += 1) {
    diff |= (candidate.charCodeAt(i) || 0) ^ configured.charCodeAt(i);
  }
  return diff === 0;
}

export function requireReadSecret(provided?: string): void {
  const configured = configuredReadSecret();
  if (!configured) {
    throw new Error("Read secret is not configured on this Convex deployment");
  }
  if (!provided || !secretsMatch(provided, configured)) {
    throw new Error("Invalid or missing read secret");
  }
}

export function checkOptionalReadSecret(provided?: string): void {
  if (provided === undefined) return;
  requireReadSecret(provided);
}
