# VertiGIS MCP – Copilot Instructions

## Project purpose
TypeScript MCP (Model Context Protocol) server that exposes an ArcGIS REST Server to LLMs as tools.

## Architecture
```
src/
  tools/
    list-services.ts     – list_services tool
    get-service-info.ts  – get_service_info tool
    get-layer-info.ts    – get_layer_info tool
    query-layer.ts       – query_layer tool
  arcgis-client.ts       – ArcGIS REST API client (auth + all HTTP calls)
  index.ts               – wiring only: McpServer + ArcGISClient + register() calls
dist/                    – compiled output (never edit directly)
```

## Build & run
```bash
npm run build        # tsc → dist/
npm run dev          # run via tsx without building
node dist/index.js   # production (requires env vars below)
```

## Required environment variables
```
ARCGIS_BASE_URL   https://…/server   (no trailing slash)
ARCGIS_USERNAME
ARCGIS_PASSWORD
```
Token is fetched from `{baseUrl replaced /server → /portal}/sharing/rest/generateToken` and cached with a 1-minute refresh buffer.

## Key conventions
- **ES modules** (`"type": "module"`): all imports need `.js` extension, even for `.ts` source files.
- **MCP SDK**: use `server.registerTool(name, { description, inputSchema }, handler)` – `server.tool()` is deprecated.
- Tool input validation is done via **Zod** schemas in `inputSchema`; no manual casting needed in handlers.
- Each tool lives in its own file under `src/tools/` and exports a single `register(server, client)` function.
- `result_record_count` is always capped at 1000 inside `query_layer` to protect against huge responses.
- ArcGIS field values for coded domains are **integers** – raw codes, not human-readable labels. A `resolve_domains` tool is planned to decode them.

## Adding a new tool
1. Add method(s) to `ArcGISClient` in `arcgis-client.ts`
2. Create `src/tools/<tool-name>.ts` – export `register(server: McpServer, client: ArcGISClient): void`
3. Import and call `register(server, client)` in `index.ts`
4. `npm run build` to verify, then restart the MCP server in VS Code (`MCP: Restart Server → vertigis`)

## VS Code MCP integration
Config lives in `.vscode/mcp.json`. The server runs as a stdio child process.  
Restart after each build: `Ctrl+Shift+P` → **MCP: Restart Server**.
