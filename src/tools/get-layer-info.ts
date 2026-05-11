import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ArcGISClient } from "../arcgis-client.js";

export function register(server: McpServer, client: ArcGISClient): void {
  server.registerTool(
    "get_layer_info",
    {
      description:
        "Returns metadata and the complete field schema for a single layer or table within a service. " +
        "Use this before querying to understand what fields are available.",
      inputSchema: {
        service_name: z.string().describe("Service name."),
        service_type: z.string().describe("Service type."),
        layer_id: z.number().int().describe("Numeric layer ID from get_service_info."),
      },
    },
    async ({ service_name, service_type, layer_id }) => {
      const result = await client.getLayerInfo(service_name, service_type, layer_id);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
