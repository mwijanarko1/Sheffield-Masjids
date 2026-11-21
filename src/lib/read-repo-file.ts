/**
 * Reads a repository file under `public/` as text. Node reads the filesystem.
 * Cloudflare Workers have no filesystem for static files, so the file comes
 * from the Static Assets binding, which serves everything in `public/`.
 * A missing file rejects with `code: "ENOENT"` on both hosts.
 */
export async function readRepoFile(filePath: string): Promise<string> {
  if (process.env.HOST_PLATFORM !== "cloudflare") {
    const { readFile } = await import("node:fs/promises");
    return readFile(filePath, "utf8");
  }

  const marker = "/public/";
  const index = filePath.lastIndexOf(marker);
  if (index === -1) throw missing(filePath);

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = getCloudflareContext();
  const assets = (env as { ASSETS: { fetch(request: Request): Promise<Response> } }).ASSETS;
  const response = await assets.fetch(
    new Request(`https://assets.invalid/${filePath.slice(index + marker.length)}`),
  );
  if (!response.ok) throw missing(filePath);
  return response.text();
}

function missing(filePath: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`ENOENT: ${filePath}`), { code: "ENOENT" });
}
