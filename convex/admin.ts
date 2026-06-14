/**
 * Admin secret guard for write mutations.
 *
 * The Convex deployment MUST have an admin secret configured via
 * Settings → Environment Variables. Accepted variable names:
 *   - ADMIN_SECRET (recommended)
 *   - DEV_SECRET or PROD_SECRET (aliases)
 *
 * Every write mutation receives an `adminSecret` argument; this
 * function verifies it matches the deployment's configured value.
 *
 * If no secret is configured on the deployment, writes are blocked
 * with a clear configuration error (fail closed).
 *
 * Usage in a mutation handler:
 *   const { adminSecret, ...data } = args;
 *   requireAdmin(adminSecret);
 */
export function requireAdmin(adminSecret?: string): void {
  const configured = (
    process.env.ADMIN_SECRET ||
    process.env.DEV_SECRET ||
    process.env.PROD_SECRET ||
    ""
  ).trim();
  if (!configured) {
    throw new Error(
      "Admin secret is not configured on this Convex deployment. " +
      "Set ADMIN_SECRET, DEV_SECRET, or PROD_SECRET in the Convex dashboard " +
      "(Settings → Environment Variables) and add the matching value " +
      "to .env.local."
    );
  }
  if (!adminSecret || adminSecret.trim() !== configured) {
    throw new Error("Invalid or missing admin secret");
  }
}
