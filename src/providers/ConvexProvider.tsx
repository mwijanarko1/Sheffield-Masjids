"use client";

import { ConvexReactClient, ConvexProvider as BaseConvexProvider } from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? ""
);

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <>{children}</>;
  }
  return <BaseConvexProvider client={convex}>{children}</BaseConvexProvider>;
}
