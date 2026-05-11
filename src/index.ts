#!/usr/bin/env node
/**
 * VertiGIS MCP Server
 *
 * Exposes ArcGIS REST Services to LLMs via the Model Context Protocol.
 *
 * Required environment variables:
 *   ARCGIS_BASE_URL  – e.g. https://dev002.networks.vertigisapps.com/server
 *   ARCGIS_USERNAME
 *   ARCGIS_PASSWORD
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ArcGISClient } from "./arcgis-client.js";
import { register as registerListServices } from "./tools/list-services.js";
import { register as registerGetServiceInfo } from "./tools/get-service-info.js";
import { register as registerGetLayerInfo } from "./tools/get-layer-info.js";
import { register as registerQueryLayer } from "./tools/query-layer.js";
import { register as registerFindLayer } from "./tools/find-layer.js";
import { register as registerGetFeatureCount } from "./tools/get-feature-count.js";

const server = new McpServer({ name: "vertigis-mcp", version: "1.0.0" });
const client = new ArcGISClient();

registerListServices(server, client);
registerGetServiceInfo(server, client);
registerGetLayerInfo(server, client);
registerQueryLayer(server, client);
registerFindLayer(server, client);
registerGetFeatureCount(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
