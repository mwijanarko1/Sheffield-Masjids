import { createHash } from "node:crypto";
import { FEEDBACK_CATEGORIES, type FeedbackReport } from "../../../convex/lib/feedbackIntake";
import { redactText } from "./redact";

export const REPORT_SCHEMA_VERSION = 1;

/** Local API surfaces an agent may report on, with the query keys each accepts. */
export const REPORTABLE_PATHS = {
  "/api/prayer-times": ["mosque", "date"],
  "/api/calendar-feed": ["mosque", "range", "year", "month", "mode"],
  "/data/mosques.json": [],
} as const satisfies Readonly<Record<string, readonly string[]>>;

const TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "category",
  "summary",
  "request",
  "response",
  "expected",
  "actual",
  "reproduction",
  "agent",
]);

const LIMITS = {
  summary: 200,
  expected: 500,
  actual: 500,
  queryValue: 100,
  contentType: 100,
  bodyExcerpt: 500,
  reproductionSteps: 5,
  reproductionStep: 200,
  agentName: 64,
  agentVersion: 32,
} as const;

export type ReportIssue = { field: string; message: string };

export type ParsedReport =
  | { ok: true; report: FeedbackReport; redacted: boolean }
  | { ok: false; issues: ReportIssue[] };

export type JsonValue = string | number | boolean | null | JsonValue[] | Json;
interface Json {
  [key: string]: JsonValue;
}
type Input = JsonValue | undefined;

// The only runtime type checks in the parser. Everything after them works on narrowed values.
function isObject(value: Input): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: Input): value is string {
  return typeof value === "string";
}

function isInteger(value: Input): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

class Collector {
  readonly issues: ReportIssue[] = [];
  redacted = false;

  fail(field: string, message: string): void {
    this.issues.push({ field, message });
  }

  /** Required or optional bounded text. Redaction runs before the length check is trusted. */
  text(value: Input, field: string, max: number, required: boolean): string | undefined {
    if (value === undefined || value === null) {
      if (required) this.fail(field, "is required");
      return undefined;
    }
    if (!isString(value)) {
      this.fail(field, "must be a string");
      return undefined;
    }
    if (CONTROL_CHARS.test(value)) {
      this.fail(field, "contains control characters");
      return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      if (required) this.fail(field, "must not be empty");
      return undefined;
    }
    if (trimmed.length > max) {
      this.fail(field, `must be at most ${max} characters`);
      return undefined;
    }
    const redaction = redactText(trimmed);
    if (redaction.changed) this.redacted = true;
    return redaction.text;
  }
}

function unknownKeys(value: Json, allowed: ReadonlySet<string>, field: string, c: Collector): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) c.fail(field ? `${field}.${key}` : key, "is not a supported field");
  }
}

function allowedQueryKeys(path: string): readonly string[] | undefined {
  return Object.entries(REPORTABLE_PATHS).find(([candidate]) => candidate === path)?.[1];
}

function parseRequest(value: Input, c: Collector): FeedbackReport["request"] | undefined {
  if (!isObject(value)) {
    c.fail("request", "must be an object");
    return undefined;
  }
  unknownKeys(value, new Set(["method", "path", "query"]), "request", c);

  const method = value.method;
  if (method !== "GET" && method !== "HEAD") c.fail("request.method", "must be GET or HEAD");

  const path = value.path;
  const allowedKeys = isString(path) ? allowedQueryKeys(path) : undefined;
  if (!allowedKeys) {
    c.fail("request.path", `must be one of ${Object.keys(REPORTABLE_PATHS).join(", ")}`);
  }

  const query: Array<{ key: string; value: string }> = [];
  const rawQuery = value.query ?? {};
  if (!isObject(rawQuery)) {
    c.fail("request.query", "must be an object of string values");
  } else {
    for (const [key, raw] of Object.entries(rawQuery)) {
      if (allowedKeys && !allowedKeys.includes(key)) {
        c.fail(`request.query.${key}`, "is not a supported query parameter for this path");
        continue;
      }
      if (!allowedKeys) continue;
      const text = c.text(raw, `request.query.${key}`, LIMITS.queryValue, false);
      query.push({ key, value: text ?? "" });
    }
  }

  if ((method !== "GET" && method !== "HEAD") || !isString(path) || !allowedKeys) return undefined;
  return { method, path, query };
}

function parseResponse(value: Input, c: Collector): FeedbackReport["response"] | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) {
    c.fail("response", "must be an object");
    return undefined;
  }
  unknownKeys(value, new Set(["status", "contentType", "bodyExcerpt"]), "response", c);

  const status = value.status;
  if (!isInteger(status) || status < 100 || status > 599) {
    c.fail("response.status", "must be an integer HTTP status from 100 to 599");
    return undefined;
  }
  const contentType = c.text(value.contentType, "response.contentType", LIMITS.contentType, false);
  const bodyExcerpt = c.text(value.bodyExcerpt, "response.bodyExcerpt", LIMITS.bodyExcerpt, false);
  const parsed: NonNullable<FeedbackReport["response"]> = { status };
  if (contentType) parsed.contentType = contentType;
  if (bodyExcerpt) parsed.bodyExcerpt = bodyExcerpt;
  return parsed;
}

function parseAgent(value: Input, c: Collector): FeedbackReport["agent"] | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) {
    c.fail("agent", "must be an object");
    return undefined;
  }
  unknownKeys(value, new Set(["name", "version"]), "agent", c);
  const name = c.text(value.name, "agent.name", LIMITS.agentName, true);
  const version = c.text(value.version, "agent.version", LIMITS.agentVersion, false);
  if (!name) return undefined;
  const parsed: NonNullable<FeedbackReport["agent"]> = { name };
  if (version) parsed.version = version;
  return parsed;
}

function parseReproduction(value: Input, c: Collector): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    c.fail("reproduction", "must be a non-empty array of steps");
    return undefined;
  }
  if (value.length > LIMITS.reproductionSteps) {
    c.fail("reproduction", `must have at most ${LIMITS.reproductionSteps} steps`);
    return undefined;
  }
  const steps: string[] = [];
  value.forEach((step, index) => {
    const text = c.text(step, `reproduction[${index}]`, LIMITS.reproductionStep, true);
    if (text) steps.push(text);
  });
  return steps;
}

/** Strict validation and redaction. Never echoes submitted values back in messages. */
export function parseFeedbackReport(input: JsonValue): ParsedReport {
  const c = new Collector();
  if (!isObject(input)) return { ok: false, issues: [{ field: "$", message: "must be a JSON object" }] };
  unknownKeys(input, TOP_LEVEL_KEYS, "", c);

  if (input.schemaVersion !== REPORT_SCHEMA_VERSION) {
    c.fail("schemaVersion", `must be ${REPORT_SCHEMA_VERSION}`);
  }

  const category = FEEDBACK_CATEGORIES.find((candidate) => candidate === input.category);
  if (!category) c.fail("category", `must be one of ${FEEDBACK_CATEGORIES.join(", ")}`);

  const summary = c.text(input.summary, "summary", LIMITS.summary, true);
  const request = parseRequest(input.request, c);
  const response = parseResponse(input.response, c);
  const expected = c.text(input.expected, "expected", LIMITS.expected, true);
  const actual = c.text(input.actual, "actual", LIMITS.actual, true);
  const reproduction = parseReproduction(input.reproduction, c);
  const agent = parseAgent(input.agent, c);

  if (c.issues.length > 0 || !category || !summary || !request || !expected || !actual || !reproduction) {
    return { ok: false, issues: c.issues };
  }

  const report: FeedbackReport = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    category,
    summary,
    request,
    expected,
    actual,
    reproduction,
  };
  if (response) report.response = response;
  if (agent) report.agent = agent;
  return { ok: true, redacted: c.redacted, report };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Identity of the failure, not of the reporter: agent metadata and client are
 * left out so renaming the agent cannot produce a "new" report.
 */
export function reportFingerprint(report: FeedbackReport): string {
  const canonical = JSON.stringify([
    report.category,
    normalize(report.summary),
    report.request.method,
    report.request.path,
    [...report.request.query].sort((a, b) => a.key.localeCompare(b.key)).map(({ key, value }) => [key, normalize(value)]),
    report.response?.status ?? null,
    normalize(report.expected),
    normalize(report.actual),
    report.reproduction.map(normalize),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Maps the fallback HTML form onto the same JSON contract so both entry points
 * share one validator. Fields the form does not set are simply absent.
 */
export function reportFromForm(form: URLSearchParams): Json {
  const field = (name: string): string | undefined => {
    const value = form.get(name);
    return value === null || value.trim() === "" ? undefined : value;
  };

  const query: Json = {};
  const rawQuery = field("requestQuery");
  if (rawQuery) {
    for (const [key, value] of new URLSearchParams(rawQuery.replace(/^\?/, ""))) query[key] = value;
  }

  const reproduction = (field("reproduction") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const statusText = field("responseStatus");
  const agentName = field("agentName");

  return compact({
    schemaVersion: Number(field("schemaVersion") ?? REPORT_SCHEMA_VERSION),
    category: field("category"),
    summary: field("summary"),
    request: compact({ method: field("requestMethod") ?? "GET", path: field("requestPath"), query }),
    response:
      statusText === undefined && !field("responseContentType") && !field("responseBodyExcerpt")
        ? undefined
        : compact({
            status: statusText === undefined ? undefined : Number(statusText),
            contentType: field("responseContentType"),
            bodyExcerpt: field("responseBodyExcerpt"),
          }),
    expected: field("expected"),
    actual: field("actual"),
    reproduction,
    agent:
      agentName === undefined
        ? undefined
        : compact({ name: agentName, version: field("agentVersion") }),
  });
}

/** Drops absent fields so the validator reports them as missing rather than null. */
function compact(fields: { [key: string]: JsonValue | undefined }): Json {
  const result: Json = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
