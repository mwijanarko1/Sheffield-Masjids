/**
 * Chrome WebMCP (origin trial / chrome://flags/#enable-webmcp-testing).
 * @see https://developer.chrome.com/docs/ai/webmcp/imperative-api
 */

type WebMcpJsonSchema = Record<string, unknown>;

interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: WebMcpJsonSchema;
  outputSchema?: WebMcpJsonSchema;
  annotations?: WebMcpToolAnnotations;
  execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

interface WebMcpRegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

interface WebMcpGetToolsOptions {
  fromOrigins?: string[];
}

interface WebMcpExecuteToolOptions {
  signal?: AbortSignal;
}

interface ModelContext extends EventTarget {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: WebMcpRegisterToolOptions,
  ): Promise<void>;
  getTools(options?: WebMcpGetToolsOptions): Promise<WebMcpToolDefinition[]>;
  executeTool(
    tool: WebMcpToolDefinition,
    inputJson: string,
    options?: WebMcpExecuteToolOptions,
  ): Promise<unknown>;
}

interface Document {
  modelContext?: ModelContext;
}
