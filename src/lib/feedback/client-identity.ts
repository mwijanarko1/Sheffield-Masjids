import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const UNVERIFIED = "unverified";

type Env = Record<string, string | undefined>;

/** Expand an IPv6 address into its eight 16-bit groups, or null when malformed. */
function ipv6Groups(address: string): number[] | null {
  let value = address.toLowerCase();
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);

  const tail = value.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (tail) {
    const octets = tail[2].split(".").map(Number);
    if (octets.some((part) => part > 255)) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    value = `${tail[1]}${high}:${low}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;

  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  const parsed = groups.map((group) => (/^[0-9a-f]{1,4}$/.test(group) ? parseInt(group, 16) : NaN));
  return parsed.length === 8 && parsed.every((part) => !Number.isNaN(part)) ? parsed : null;
}

/**
 * IPv4 stays whole. IPv6 collapses to its /64 so rotating within a subscriber
 * prefix shares one budget. IPv4-mapped IPv6 normalises to the IPv4 address.
 */
export function normalizeClientIp(raw: string): string | null {
  const value = raw.trim();
  const family = isIP(value);
  if (family === 4) return value;
  if (family !== 6) return null;

  const groups = ipv6Groups(value);
  if (!groups) return null;
  const isMapped =
    groups.slice(0, 5).every((part) => part === 0) && groups[5] === 0xffff;
  if (isMapped) {
    return [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff].join(".");
  }
  return `${groups.slice(0, 4).map((part) => part.toString(16)).join(":")}::/64`;
}

/**
 * Identity comes only from the hosting platform's verified header. Forwarded
 * headers a caller can set are never read. Outside the platform every caller
 * shares one budget, which fails safe.
 */
export function verifiedClientIdentity(headers: Headers, env: Env): string {
  if (!env.VERCEL) return UNVERIFIED;
  const verified = headers.get("x-vercel-forwarded-for")?.split(",")[0] ?? "";
  return normalizeClientIp(verified) ?? UNVERIFIED;
}

/** Salted HMAC so storage holds an opaque key, never a raw address. */
export function clientKey(identity: string, salt: string): string {
  return createHmac("sha256", salt).update(`client:${identity}`).digest("hex");
}
