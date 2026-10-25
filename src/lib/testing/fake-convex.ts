import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Minimal stand-in for a Convex deployment's HTTP API (`/api/query` and
 * `/api/mutation`) so tests exercise the real ConvexHttpClient wire path,
 * including the readSecret argument, without touching a real deployment.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type FakeArgs = { [key: string]: JsonValue };
export type FakeCall = { kind: "query" | "mutation"; path: string; args: FakeArgs };
export type FakeHandler = (args: FakeArgs) => JsonValue;

export type FakeConvex = {
  url: string;
  calls: FakeCall[];
  handlers: Map<string, FakeHandler>;
  close(): Promise<void>;
};

export async function startFakeConvex(): Promise<FakeConvex> {
  const calls: FakeCall[] = [];
  const handlers = new Map<string, FakeHandler>();

  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const kind = req.url === "/api/mutation" ? "mutation" : "query";
      // SAFETY: Test-only server; ConvexHttpClient always posts { path, format, args: [argsObject] }.
      const parsed = JSON.parse(body) as { path: string; args: FakeArgs[] };
      const args = parsed.args[0] ?? {};
      calls.push({ kind, path: parsed.path, args });
      const handler = handlers.get(parsed.path);
      res.setHeader("Content-Type", "application/json");
      if (!handler) {
        res.statusCode = 560;
        res.end(JSON.stringify({ status: "error", errorMessage: `No handler for ${parsed.path}`, logLines: [] }));
        return;
      }
      try {
        const value = handler(args);
        res.statusCode = 200;
        res.end(JSON.stringify({ status: "success", value, logLines: [] }));
      } catch (error) {
        res.statusCode = 560;
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.end(JSON.stringify({ status: "error", errorMessage, logLines: [] }));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  // SAFETY: listen() on a TCP host/port resolves address() to an AddressInfo, never a pipe string.
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    handlers,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** Run `fn` with CONVEX_URL / CONVEX_READ_SECRET pointed at the fake, then restore. */
export async function withConvexEnv<T>(
  env: { CONVEX_URL?: string; CONVEX_READ_SECRET?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const previous = { url: process.env.CONVEX_URL, secret: process.env.CONVEX_READ_SECRET };
  const assign = (key: "CONVEX_URL" | "CONVEX_READ_SECRET", value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };
  assign("CONVEX_URL", env.CONVEX_URL);
  assign("CONVEX_READ_SECRET", env.CONVEX_READ_SECRET);
  try {
    return await fn();
  } finally {
    assign("CONVEX_URL", previous.url);
    assign("CONVEX_READ_SECRET", previous.secret);
  }
}
