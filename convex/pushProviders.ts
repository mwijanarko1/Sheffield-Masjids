"use node";

/**
 * Production APNs + FCM transports.
 *
 * Environment variables (Convex dashboard):
 * - APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_KEY_P8
 * - APNS_PRODUCTION ("true" for prod APNs host)
 * - FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
 *
 * Missing credentials → temporary_failure (safe for tests / partial setup).
 */

import * as crypto from "crypto";
import type {
  IqamahChangePushPayload,
  PushPlatform,
  PushSendResult,
  PushTransport,
} from "./lib/pushTransport";

const IOS_LOC_KEY = "notification.iqamah_change.body";
const IOS_TITLE_LOC_KEY = "notification.iqamah_change.title";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

type JwtClaims = Record<string, string | number>;

function signEs256Jwt(
  payload: JwtClaims,
  privateKeyPem: string,
  keyId?: string,
): string {
  const header = { alg: "ES256", typ: "JWT", kid: keyId };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();
  // Convert DER signature to JOSE raw r||s
  const der = sign.sign(privateKeyPem);
  const raw = derToJose(der);
  return `${data}.${base64url(raw)}`;
}

function derToJose(der: Buffer): Buffer {
  // Minimal ECDSA DER → R||S (32+32) for P-256
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;
  if (der[offset] !== 0x02) throw new Error("Invalid DER signature");
  const rLen = der[offset + 1];
  let r = der.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error("Invalid DER signature");
  const sLen = der[offset + 1];
  let s = der.subarray(offset + 2, offset + 2 + sLen);
  if (r.length > 32) r = r.subarray(r.length - 32);
  if (s.length > 32) s = s.subarray(s.length - 32);
  const out = Buffer.alloc(64);
  r.copy(out, 32 - r.length);
  s.copy(out, 64 - s.length);
  return out;
}

function normalizePem(raw: string): string {
  // Support env values with escaped newlines
  let pem = raw.replace(/\\n/g, "\n").trim();
  if (!pem.includes("BEGIN")) {
    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
  }
  return pem;
}

let apnsJwtCache: { token: string; exp: number } | null = null;
let fcmAccessCache: { token: string; exp: number } | null = null;

function getApnsJwt(): string | null {
  const keyId = env("APNS_KEY_ID");
  const teamId = env("APNS_TEAM_ID");
  const keyP8 = env("APNS_KEY_P8");
  if (!keyId || !teamId || !keyP8) return null;

  const now = Math.floor(Date.now() / 1000);
  if (apnsJwtCache && apnsJwtCache.exp - 60 > now) return apnsJwtCache.token;

  const token = signEs256Jwt(
    { iss: teamId, iat: now },
    normalizePem(keyP8),
    keyId,
  );
  apnsJwtCache = { token, exp: now + 3500 };
  return token;
}

async function getFcmAccessToken(): Promise<string | null> {
  const email = env("FCM_CLIENT_EMAIL");
  const key = env("FCM_PRIVATE_KEY");
  if (!email || !key) return null;

  const now = Math.floor(Date.now() / 1000);
  if (fcmAccessCache && fcmAccessCache.exp - 60 > now) return fcmAccessCache.token;

  const assertion = signEs256Jwt(
    {
      iss: email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    normalizePem(key),
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    return null;
  }
  const json: { access_token?: string; expires_in?: number } = await res.json();
  if (!json.access_token) return null;
  fcmAccessCache = {
    token: json.access_token,
    exp: now + (json.expires_in ?? 3600),
  };
  return json.access_token;
}

async function sendApns(
  deviceToken: string,
  payload: IqamahChangePushPayload,
): Promise<PushSendResult> {
  const jwt = getApnsJwt();
  const bundleId = env("APNS_BUNDLE_ID");
  if (!jwt || !bundleId) {
    return {
      status: "temporary_failure",
      message: "APNs credentials not configured",
    };
  }

  const production = env("APNS_PRODUCTION") === "true";
  const host = production
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

  const body = {
    aps: {
      alert: {
        "title-loc-key": IOS_TITLE_LOC_KEY,
        "loc-key": IOS_LOC_KEY,
        "loc-args": [payload.mosqueName],
      },
      sound: "default",
    },
    kind: payload.kind,
    mosqueSlug: payload.mosqueSlug,
    publishEventId: payload.publishEventId,
  };

  try {
    const res = await fetch(`${host}/3/device/${deviceToken}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 200) return { status: "ok" };
    if (res.status === 410) {
      return {
        status: "permanent_failure",
        message: "APNs 410",
        reason: "unregistered",
      };
    }
    if (res.status === 400) {
      const text = await res.text();
      if (text.includes("BadDeviceToken")) {
        return {
          status: "permanent_failure",
          message: text.slice(0, 200),
          reason: "invalid",
        };
      }
      return { status: "temporary_failure", message: text.slice(0, 200) };
    }
    return {
      status: "temporary_failure",
      message: `APNs HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      status: "temporary_failure",
      message: e instanceof Error ? e.message : "APNs network error",
    };
  }
}

async function sendFcm(
  deviceToken: string,
  payload: IqamahChangePushPayload,
): Promise<PushSendResult> {
  const projectId = env("FCM_PROJECT_ID");
  const accessToken = await getFcmAccessToken();
  if (!projectId || !accessToken) {
    return {
      status: "temporary_failure",
      message: "FCM credentials not configured",
    };
  }

  // Data-only high-priority message so FirebaseMessagingService always handles presentation.
  const body = {
    message: {
      token: deviceToken,
      android: {
        priority: "HIGH",
      },
      data: {
        kind: payload.kind,
        mosqueSlug: payload.mosqueSlug,
        publishEventId: payload.publishEventId,
        mosqueName: payload.mosqueName,
      },
    },
  };

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) return { status: "ok" };

    const text = await res.text();
    if (
      res.status === 404 ||
      text.includes("UNREGISTERED") ||
      text.includes("NOT_FOUND")
    ) {
      return {
        status: "permanent_failure",
        message: text.slice(0, 200),
        reason: "unregistered",
      };
    }
    if (res.status === 400 && text.includes("INVALID_ARGUMENT")) {
      return {
        status: "permanent_failure",
        message: text.slice(0, 200),
        reason: "invalid",
      };
    }
    return {
      status: "temporary_failure",
      message: `FCM HTTP ${res.status}: ${text.slice(0, 160)}`,
    };
  } catch (e) {
    return {
      status: "temporary_failure",
      message: e instanceof Error ? e.message : "FCM network error",
    };
  }
}

export function createProductionTransport(): PushTransport {
  return {
    async sendIqamahChangeAlert(
      platform: PushPlatform,
      token: string,
      payload: IqamahChangePushPayload,
    ): Promise<PushSendResult> {
      if (platform === "ios") return sendApns(token, payload);
      return sendFcm(token, payload);
    },
  };
}
