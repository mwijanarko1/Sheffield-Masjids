import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { checkOptionalReadSecret, requireReadSecret } from "./readAccess";
import * as prayerTimes from "../prayerTimes";
import * as mosques from "../mosques.js";
import * as pushSubscriptions from "../pushSubscriptions";
import * as rateLimits from "../rateLimits";

const SECRET = "convex-read-secret-for-tests";

type GuardArgs = {
  readSecret?: string;
  citySlug?: string;
  mosqueSlug?: string;
  month?: string;
  year?: number;
  key?: string;
  limit?: number;
  windowMs?: number;
};

type FakeQueryChain = {
  withIndex(): FakeQueryChain;
  order(): FakeQueryChain;
  filter(): FakeQueryChain;
  collect(): Promise<never[]>;
  unique(): Promise<null>;
  take(): Promise<never[]>;
  first(): Promise<null>;
};

type FakeCtx = {
  db: {
    query(): FakeQueryChain;
    insert(): Promise<string>;
    patch(): Promise<void>;
    delete(): Promise<void>;
  };
};

/** Fields every convex/server registered function carries. */
type ConvexFunctionExport = { isQuery?: true; isMutation?: true; isPublic?: true; isInternal?: true };

type Registered = ConvexFunctionExport & {
  _handler(ctx: FakeCtx, args: GuardArgs): Promise<object | null>;
};

function registered(fn: ConvexFunctionExport): Registered {
  // SAFETY: convex/server registration (registration_impl.js) attaches
  // isQuery/isPublic/isInternal and _handler to every registered function.
  return fn as Registered;
}

async function withSecret<T>(value: string | undefined, fn: () => T | Promise<T>): Promise<T> {
  const previous = process.env.CONVEX_READ_SECRET;
  if (value === undefined) delete process.env.CONVEX_READ_SECRET;
  else process.env.CONVEX_READ_SECRET = value;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.CONVEX_READ_SECRET;
    else process.env.CONVEX_READ_SECRET = previous;
  }
}

/** Fake ctx whose db returns empty results, so handlers get past the guard. */
function emptyCtx(): FakeCtx {
  const chain: FakeQueryChain = {
    withIndex: () => chain,
    order: () => chain,
    filter: () => chain,
    collect: async () => [],
    unique: async () => null,
    take: async () => [],
    first: async () => null,
  };
  return {
    db: {
      query: () => chain,
      insert: async () => "id",
      patch: async () => undefined,
      delete: async () => undefined,
    },
  };
}

test("requireReadSecret fails closed", async () => {
  await withSecret(undefined, () => {
    assert.throws(() => requireReadSecret(SECRET), /not configured/);
  });
  await withSecret(SECRET, () => {
    assert.throws(() => requireReadSecret(undefined), /Invalid or missing read secret/);
    assert.throws(() => requireReadSecret("nope"), /Invalid or missing read secret/);
    assert.throws(() => requireReadSecret(`${SECRET}x`), /Invalid or missing read secret/);
    assert.doesNotThrow(() => requireReadSecret(SECRET));
  });
});

test("checkOptionalReadSecret allows no secret but rejects a wrong one", async () => {
  await withSecret(SECRET, () => {
    assert.doesNotThrow(() => checkOptionalReadSecret(undefined));
    assert.doesNotThrow(() => checkOptionalReadSecret(SECRET));
    assert.throws(() => checkOptionalReadSecret("wrong"), /Invalid or missing read secret/);
  });
  await withSecret(undefined, () => {
    assert.doesNotThrow(() => checkOptionalReadSecret(undefined));
  });
});

const LOCKED: Array<[string, Registered, GuardArgs]> = [
  ["prayerTimes:getUkDstDates", registered(prayerTimes.getUkDstDates), {}],
  ["mosques:listByCity", registered(mosques.listByCity), { citySlug: "sheffield" }],
  ["mosques:listCities", registered(mosques.listCities), {}],
];

// Left public on purpose: the shipped Masjidly iOS and Android apps call these
// with no secret. See the comments in convex/prayerTimes.ts and convex/mosques.js.
const PUBLIC_FOR_APPS: Array<[string, Registered, GuardArgs]> = [
  ["prayerTimes:getMonthly", registered(prayerTimes.getMonthly), { mosqueSlug: "x", month: "may", year: 2026 }],
  ["prayerTimes:getRamadan", registered(prayerTimes.getRamadan), { mosqueSlug: "x" }],
  ["prayerTimes:getDataRevision", registered(prayerTimes.getDataRevision), {}],
  ["prayerTimes:getDataVersions", registered(prayerTimes.getDataVersions), { mosqueSlug: "x", month: "may", year: 2026 }],
  ["mosques:list", registered(mosques.list), {}],
];

for (const [name, fn, args] of LOCKED) {
  test(`${name} requires the read secret`, async () => {
    await withSecret(SECRET, async () => {
      await assert.rejects(fn._handler(emptyCtx(), args), /Invalid or missing read secret/);
      await assert.rejects(fn._handler(emptyCtx(), { ...args, readSecret: "wrong" }), /Invalid or missing read secret/);
      await assert.doesNotReject(fn._handler(emptyCtx(), { ...args, readSecret: SECRET }));
    });
    await withSecret(undefined, async () => {
      await assert.rejects(fn._handler(emptyCtx(), { ...args, readSecret: SECRET }), /not configured/);
    });
  });
}

for (const [name, fn, args] of PUBLIC_FOR_APPS) {
  test(`${name} stays callable without a secret (Masjidly apps) and rejects a wrong one`, async () => {
    await withSecret(SECRET, async () => {
      await assert.doesNotReject(fn._handler(emptyCtx(), args));
      await assert.doesNotReject(fn._handler(emptyCtx(), { ...args, readSecret: SECRET }));
      await assert.rejects(fn._handler(emptyCtx(), { ...args, readSecret: "wrong" }), /Invalid or missing read secret/);
    });
  });
}

test("pushSubscriptions:stats is internal", () => {
  const stats = registered(pushSubscriptions.stats);
  assert.equal(stats.isInternal, true);
  assert.notEqual(stats.isPublic, true);
});

test("rateLimits:consume requires the read secret", async () => {
  const consume = registered(rateLimits.consume);
  const args = { key: "api:prayer-times:abcdefghijklmnop", limit: 60, windowMs: 60_000 };
  await withSecret(SECRET, async () => {
    await assert.rejects(consume._handler(emptyCtx(), { ...args, readSecret: "wrong" }), /Invalid or missing read secret/);
    const result = await consume._handler(emptyCtx(), { ...args, readSecret: SECRET });
    assert.deepEqual(Object.keys(result ?? {}).sort(), ["allowed", "remaining", "resetAt"]);
    await assert.rejects(
      consume._handler(emptyCtx(), { ...args, key: "push.register.global", readSecret: SECRET }),
      /Invalid rate limit key/,
    );
  });
});

/**
 * Inventory: every public query in convex/ must be classified above, so a new
 * public query cannot ship without deciding whether it is locked.
 */
test("every public Convex query is either locked or explicitly left public", async () => {
  const classified = new Set([...LOCKED, ...PUBLIC_FOR_APPS].map(([name]) => name));
  // Admin-secret guarded queries (requireAdmin), unchanged by this lock.
  const adminGuarded = new Set(["feedback:listReports", "feedback:counters"]);
  const convexDir = join(process.cwd(), "convex");
  const files = readdirSync(convexDir).filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith(".test.ts"));
  const unclassified: string[] = [];
  for (const file of files) {
    const moduleName = file.replace(/\.(ts|js)$/, "");
    if (moduleName === "schema") continue;
    const mod: object = await import(join(convexDir, file));
    for (const [exportName, value] of Object.entries(mod)) {
      if (value?.isQuery === true && value.isPublic === true) {
        const name = `${moduleName}:${exportName}`;
        if (!classified.has(name) && !adminGuarded.has(name)) unclassified.push(name);
      }
    }
  }
  assert.deepEqual(unclassified, []);
});
