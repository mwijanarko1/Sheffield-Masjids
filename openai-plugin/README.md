# OpenAI ChatGPT / Codex plugin

Remote MCP for published mosque prayer times.

## Endpoint

- Production: `https://www.sheffieldmasjids.com/mcp`
- Alias: `https://www.sheffieldmasjids.com/api/mcp`
- Auth: none
- Tools: `search_mosques`, `get_prayer_times`

## Package

Submit the contents of `openai-plugin/` as a ZIP from [platform.openai.com/plugins](https://platform.openai.com/plugins).

## Domain verification

1. Copy the challenge token from the OpenAI Plugins portal.
2. Set `OPENAI_APPS_CHALLENGE_TOKEN` on the production host.
3. Confirm `GET https://www.sheffieldmasjids.com/.well-known/openai-apps-challenge` returns the exact token as `text/plain`.

## Local checks

```bash
bun run test:mcp
bun run dev
# Then connect MCP Inspector to http://localhost:3000/mcp (Streamable HTTP)
```
