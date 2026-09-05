"use client";

import { useEffect } from "react";
import { registerWebMcpTools } from "@/lib/webmcp-tools";

/**
 * Registers WebMCP tools when document.modelContext is available
 * (Chrome origin trial or chrome://flags/#enable-webmcp-testing).
 */
export default function WebMcpTools() {
  useEffect(() => {
    let disposed = false;
    let unregister: (() => void) | undefined;

    void registerWebMcpTools()
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unregister = cleanup;
      })
      .catch((error: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[webmcp] tool registration failed", error);
        }
      });

    return () => {
      disposed = true;
      unregister?.();
    };
  }, []);

  return null;
}
