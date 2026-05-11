import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ArcGISClient } from "../arcgis-client.js";

export function register(server: McpServer, client: ArcGISClient): void {
  server.registerTool(
    "find_layer",
    {
      description:
        "Searches ALL services and folders on the ArcGIS Server for layers whose name contains " +
        "the given keyword (case-insensitive). Returns service_name, service_type, layer_id, and " +
        "layer_name for every match. " +
        "Use this when you know what kind of data you are looking for but not which service " +
        "contains it, e.g. 'pipes', 'hydrant', 'parcel', 'address'. " +
        "The returned values can be passed directly to get_layer_info and query_layer.",
      inputSchema: {
        keyword: z
          .string()
          .describe(
            "Substring to search for in layer names, e.g. 'pipe', 'hydrant', 'parcel'. " +
              "Case-insensitive."
          ),
      },
    },
    async ({ keyword }) => {
      const results = await client.findLayer(keyword);
      const text =
        results.length === 0
          ? `No layers found matching "${keyword}".`
          : JSON.stringify(results, null, 2);
      return { content: [{ type: "text", text }] };
    }
  );
}
