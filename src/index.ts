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
import { z } from "zod";
import { ArcGISClient } from "./arcgis-client.js";

// Initialise the ArcGIS client (reads env vars)
const client = new ArcGISClient();

// ---------- MCP Server setup ----------

const server = new McpServer({ name: "vertigis-mcp", version: "1.0.0" });

// ---------- Tools ----------

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
        .describe("Name of the folder to list (e.g. 'Berlin_postgres_152'). Omit for the root folder."),
    },
  },
  async ({ folder }) => {
    const result = await client.listServices(folder);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "get_service_info",
  {
    description:
      "Returns detailed metadata for a specific ArcGIS service, including all layers and tables " +
      "with their IDs, names, geometry types and spatial reference.",
    inputSchema: {
      service_name: z
        .string()
        .describe("Service name as shown in list_services, e.g. 'Naperville_Water_postgres_13'."),
      service_type: z
        .string()
        .describe("Service type, e.g. 'MapServer', 'FeatureServer', 'UtilityNetworkServer'."),
    },
  },
  async ({ service_name, service_type }) => {
    const result = await client.getServiceInfo(service_name, service_type);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

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

server.registerTool(
  "query_layer",
  {
    description:
      "Queries features from a specific layer using an SQL WHERE clause and optional spatial filter. " +
      "Returns attribute values and optionally geometry. Default limit is 100 records.",
    inputSchema: {
      service_name: z.string().describe("Service name."),
      service_type: z.string().describe("Service type."),
      layer_id: z.number().int().describe("Numeric layer ID."),
      where: z
        .string()
        .default("1=1")
        .describe("SQL WHERE clause, e.g. \"STATUS = 'Active'\". Use '1=1' to return all records."),
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
      in_sr: z.string().optional().describe("WKID of the input geometry's spatial reference, e.g. '4326'."),
      out_sr: z
        .string()
        .optional()
        .describe("WKID of the output spatial reference for returned geometries, e.g. '4326'."),
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
      inSR: in_sr,
      outSR: out_sr,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ---------- Start ----------

const transport = new StdioServerTransport();
await server.connect(transport);
