import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ArcGISClient } from "../arcgis-client.js";

export function register(server: McpServer, client: ArcGISClient): void {
  server.registerTool(
    "get_service_info",
    {
      description:
        "Returns detailed metadata for a specific ArcGIS service, including all layers and tables " +
        "with their IDs, names, geometry types and spatial reference. " +
        "WORKFLOW: Call after list_services to inspect a service before querying it. " +
        "Note the layer IDs — they are required by get_layer_info and query_layer.",
      inputSchema: {
        service_name: z
          .string()
          .describe(
            "Service name as shown in list_services, e.g. 'Naperville_Water_postgres_13'."
          ),
        service_type: z
          .string()
          .describe(
            "Service type, e.g. 'MapServer', 'FeatureServer', 'UtilityNetworkServer'."
          ),
      },
    },
    async ({ service_name, service_type }) => {
      const result = await client.getServiceInfo(service_name, service_type);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
