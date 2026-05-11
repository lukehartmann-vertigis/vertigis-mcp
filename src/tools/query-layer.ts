import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ArcGISClient } from "../arcgis-client.js";

export function register(server: McpServer, client: ArcGISClient): void {
  server.registerTool(
    "query_layer",
    {
      description:
        "Queries features from a specific layer using an SQL WHERE clause and optional spatial filter. " +
        "Returns attribute values and optionally geometry. Default limit is 100 records. " +
        "WORKFLOW: Requires service_name, service_type, and layer_id — use find_layer to discover " +
        "these if you only know what kind of data you want. " +
        "Use get_layer_info first to learn field names, types, and valid coded values. " +
        "Use get_feature_count to check the total number of matching records before fetching.",
      inputSchema: {
        service_name: z.string().describe("Service name."),
        service_type: z.string().describe("Service type."),
        layer_id: z.number().int().describe("Numeric layer ID."),
        where: z
          .string()
          .default("1=1")
          .describe(
            "SQL WHERE clause, e.g. \"STATUS = 'Active'\". Use '1=1' to return all records."
          ),
        out_fields: z
          .string()
          .default("*")
          .describe("Comma-separated list of field names to return, or '*' for all."),
        return_geometry: z
          .boolean()
          .default(false)
          .describe("Whether to include geometry in the response."),
        result_record_count: z
          .number()
          .int()
          .default(100)
          .describe("Maximum number of records to return (default 100, max 1000)."),
        order_by_fields: z
          .string()
          .optional()
          .describe("Optional field name(s) to sort by, e.g. 'OBJECTID ASC'."),
        geometry: z
          .string()
          .optional()
          .describe(
            "Optional spatial filter geometry as JSON string, e.g. " +
              "'{\"xmin\":-90,\"ymin\":41,\"xmax\":-88,\"ymax\":43,\"spatialReference\":{\"wkid\":4326}}'."
          ),
        geometry_type: z
          .string()
          .optional()
          .describe(
            "Type of geometry for spatial filter: esriGeometryEnvelope, esriGeometryPoint, " +
              "esriGeometryPolyline, esriGeometryPolygon."
          ),
        spatial_rel: z
          .string()
          .optional()
          .describe(
            "Spatial relationship for the filter, e.g. 'esriSpatialRelIntersects' (default), " +
              "'esriSpatialRelContains', 'esriSpatialRelWithin'."
          ),
        in_sr: z
          .string()
          .optional()
          .describe("WKID of the input geometry's spatial reference, e.g. '4326'."),
        out_sr: z
          .string()
          .optional()
          .describe(
            "WKID of the output spatial reference for returned geometries, e.g. '4326'."
          ),
      },
    },
    async ({
      service_name,
      service_type,
      layer_id,
      where,
      out_fields,
      return_geometry,
      result_record_count,
      order_by_fields,
      geometry,
      geometry_type,
      spatial_rel,
      in_sr,
      out_sr,
    }) => {
      const result = await client.queryLayer(service_name, service_type, layer_id, {
        where,
        outFields: out_fields,
        returnGeometry: return_geometry,
        resultRecordCount: Math.min(result_record_count, 1000),
        orderByFields: order_by_fields,
        geometry,
        geometryType: geometry_type,
        spatialRel: spatial_rel,
        inSR: in_sr,
        outSR: out_sr,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
