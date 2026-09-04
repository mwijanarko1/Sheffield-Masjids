import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  // Dev browsers hitting 127.0.0.1 instead of localhost need this for HMR/hydration.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig; 