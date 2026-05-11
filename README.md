# vertigis-mcp

MCP (Model Context Protocol) server that exposes an ArcGIS REST Server as tools for LLMs.

## Tools

| Tool | Description |
|---|---|
| `list_services` | List all services and sub-folders on the ArcGIS Server |
| `get_service_info` | Metadata for a service (layers, geometry types, spatial reference) |
| `get_layer_info` | Full field schema for a single layer |
| `query_layer` | Query features via SQL WHERE clause and optional spatial filter |

## Requirements

- Node.js 20+
- Access to an ArcGIS Server with token-based authentication (via ArcGIS Portal)

## Setup

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
ARCGIS_BASE_URL=https://your-server/server
ARCGIS_USERNAME=your_username
ARCGIS_PASSWORD=your_password
```

> The token endpoint is derived automatically: `/server` → `/portal/sharing/rest/generateToken`

## Local testing

### Option 1: VS Code with GitHub Copilot (recommended)

1. Open the workspace in VS Code with the GitHub Copilot extension installed.
2. The `.vscode/mcp.json` is already configured. VS Code will prompt for username and password on first use.
3. Build the project: `npm run build`
4. Start the MCP server: `Ctrl+Shift+P` → **MCP: List Servers** → `vertigis` → **Start Server**
5. Open Copilot Chat in Agent mode and test a tool, e.g.:
   > *List all available GIS services*

After any code change, run `npm run build` and restart the server.

### Option 2: MCP Inspector (browser UI)

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Opens a web UI at `http://localhost:5173`. Set environment variables in the UI under **Environment**:

| Key | Value |
|---|---|
| `ARCGIS_BASE_URL` | `https://your-server/server` |
| `ARCGIS_USERNAME` | your username |
| `ARCGIS_PASSWORD` | your password |

Then call tools directly and inspect the JSON responses.

## Adding a new tool

1. Add a method to `ArcGISClient` in `src/arcgis-client.ts`
2. Create `src/tools/<tool-name>.ts` – export `register(server, client)`
3. Import and call it in `src/index.ts`
4. `npm run build` → restart MCP server in VS Code
