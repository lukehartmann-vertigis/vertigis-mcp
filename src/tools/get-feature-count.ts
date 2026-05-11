import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ArcGISClient } from "../arcgis-client.js";

export function register(server: McpServer, client: ArcGISClient): void {
  server.registerTool(
    "get_feature_count",
    {
      description:
        "Returns the number of features in a layer that match a WHERE clause, without fetching " +
        "the actual records. Use this to answer 'how many X are there?' questions efficiently, " +
        "or to check result size before running query_layer.",
      inputSchema: {
        service_name: z.string().describe("Service name (from list_services or find_layer)."),
        service_type: z
          .string()
          .describe("Service type, e.g. 'MapServer', 'FeatureServer'."),
        layer_id: z.number().int().describe("Numeric layer ID."),
        where: z
          .string()
          .default("1=1")
          .describe(
            "SQL WHERE clause to filter features, e.g. \"STATUS = 'Active'\". " +
              "Use '1=1' to count all features."
          ),
      },
    },
    async ({ service_name, service_type, layer_id, where }) => {
      const count = await client.getFeatureCount(service_name, service_type, layer_id, where);
      return { content: [{ type: "text", text: String(count) }] };
    }
  );
}
