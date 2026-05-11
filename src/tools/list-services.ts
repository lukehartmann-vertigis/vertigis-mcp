import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ArcGISClient } from "../arcgis-client.js";

export function register(server: McpServer, client: ArcGISClient): void {
  server.registerTool(
    "list_services",
    {
      description:
        "Lists all GIS services and sub-folders available on the ArcGIS Server. " +
        "Optionally restricted to a specific folder. Returns service names, types (MapServer, " +
        "FeatureServer, UtilityNetworkServer, …) and their URLs.",
      inputSchema: {
        folder: z
          .string()
          .optional()
          .describe(
            "Name of the folder to list (e.g. 'Berlin_postgres_152'). Omit for the root folder."
          ),
      },
    },
    async ({ folder }) => {
      const result = await client.listServices(folder);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
