/**
 * ArcGIS REST API client with token-based authentication.
 * Credentials are read from environment variables:
 *   ARCGIS_BASE_URL  – base URL of the ArcGIS Server, e.g. https://host/server
 *   ARCGIS_USERNAME  – ArcGIS username
 *   ARCGIS_PASSWORD  – ArcGIS password
 */

export interface ArcGISToken {
  token: string;
  expires: number; // ms epoch
}

export interface ServiceInfo {
  name: string;
  type: string;
  url: string;
}

export interface FolderInfo {
  folders: string[];
  services: ServiceInfo[];
}

export interface LayerInfo {
  id: number;
  name: string;
  type: string;
  geometryType?: string;
  fields?: FieldInfo[];
}

export interface CodedValue {
  name: string;
  code: string | number;
}

export interface FieldDomain {
  type: string;
  name?: string;
  codedValues?: CodedValue[];
  range?: [number, number];
}

export interface FieldInfo {
  name: string;
  type: string;
  alias: string;
  domain?: FieldDomain;
}

export interface FindLayerResult {
  service_name: string;
  service_type: string;
  layer_id: number;
  layer_name: string;
  layer_type?: string;
}

export interface QueryResult {
  fields?: FieldInfo[];
  features: Array<{
    attributes: Record<string, unknown>;
    geometry?: unknown;
  }>;
  exceededTransferLimit?: boolean;
}

export class ArcGISClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private cachedToken: ArcGISToken | null = null;

  constructor() {
    const baseUrl = process.env.ARCGIS_BASE_URL;
    const username = process.env.ARCGIS_USERNAME;
    const password = process.env.ARCGIS_PASSWORD;

    if (!baseUrl || !username || !password) {
      throw new Error(
        "Missing required environment variables: ARCGIS_BASE_URL, ARCGIS_USERNAME, ARCGIS_PASSWORD"
      );
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.username = username;
    this.password = password;
  }

  // ---------- Authentication ----------

  private async generateToken(): Promise<ArcGISToken> {
    // Token endpoint is on the Portal, not directly on the ArcGIS Server.
    // Derived by replacing /server with /portal in the base URL.
    const portalBase = this.baseUrl.replace(/\/server\/?$/, "/portal");
    const tokenUrl = `${portalBase}/sharing/rest/generateToken`;
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      client: "referer",
      referer: this.baseUrl,
      expiration: "60",
      f: "json",
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      token?: string;
      expires?: number;
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`ArcGIS authentication error: ${data.error.message}`);
    }

    if (!data.token || !data.expires) {
      throw new Error("Invalid token response from server");
    }

    return { token: data.token, expires: data.expires };
  }

  async getToken(): Promise<string> {
    const bufferMs = 60_000; // refresh 1 minute before expiry
    if (!this.cachedToken || Date.now() >= this.cachedToken.expires - bufferMs) {
      this.cachedToken = await this.generateToken();
    }
    return this.cachedToken.token;
  }

  // ---------- HTTP helpers ----------

  private async getJson<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("f", "json");
    url.searchParams.set("token", token);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url.toString()}`);
    }

    const data = (await response.json()) as T & { error?: { message: string } };
    if ((data as { error?: { message: string } }).error) {
      throw new Error(
        `ArcGIS error: ${(data as { error: { message: string } }).error.message}`
      );
    }
    return data;
  }

  private async postJson<T>(path: string, body: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    const params = new URLSearchParams({ ...body, f: "json", token });

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${this.baseUrl}${path}`);
    }

    const data = (await response.json()) as T & { error?: { message: string } };
    if ((data as { error?: { message: string } }).error) {
      throw new Error(
        `ArcGIS error: ${(data as { error: { message: string } }).error.message}`
      );
    }
    return data;
  }

  // ---------- Services ----------

  /**
   * Lists all services and sub-folders in a given folder (default: root "/").
   */
  async listServices(folder?: string): Promise<FolderInfo> {
    const path = folder ? `/rest/services/${folder}` : "/rest/services";
    const raw = await this.getJson<{
      folders?: string[];
      services?: Array<{ name: string; type: string }>;
    }>(path);

    const services: ServiceInfo[] = (raw.services ?? []).map((s) => ({
      name: s.name,
      type: s.type,
      url: `${this.baseUrl}/rest/services/${s.name}/${s.type}`,
    }));

    return {
      folders: raw.folders ?? [],
      services,
    };
  }

  /**
   * Returns metadata for a specific service including its layers.
   */
  async getServiceInfo(serviceName: string, serviceType: string): Promise<unknown> {
    return this.getJson(`/rest/services/${serviceName}/${serviceType}`);
  }

  /**
   * Returns metadata + fields for a single layer.
   */
  async getLayerInfo(
    serviceName: string,
    serviceType: string,
    layerId: number
  ): Promise<LayerInfo> {
    const raw = await this.getJson<{
      id: number;
      name: string;
      type: string;
      geometryType?: string;
      fields?: Array<{
        name: string;
        type: string;
        alias: string;
        domain?: {
          type: string;
          name?: string;
          codedValues?: Array<{ name: string; code: string | number }>;
          range?: [number, number];
        };
      }>;
    }>(`/rest/services/${serviceName}/${serviceType}/${layerId}`);

    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      geometryType: raw.geometryType,
      fields: raw.fields?.map((f) => ({
        name: f.name,
        type: f.type,
        alias: f.alias,
        ...(f.domain ? { domain: f.domain } : {}),
      })),
    };
  }

  /**
   * Queries a feature layer.
   */
  async queryLayer(
    serviceName: string,
    serviceType: string,
    layerId: number,
    options: {
      where?: string;
      outFields?: string;
      returnGeometry?: boolean;
      resultRecordCount?: number;
      orderByFields?: string;
      geometry?: string;
      geometryType?: string;
      spatialRel?: string;
      inSR?: string;
      outSR?: string;
    } = {}
  ): Promise<QueryResult> {
    const body: Record<string, string> = {
      where: options.where ?? "1=1",
      outFields: options.outFields ?? "*",
      returnGeometry: String(options.returnGeometry ?? false),
    };

    if (options.resultRecordCount !== undefined) {
      body.resultRecordCount = String(options.resultRecordCount);
    }
    if (options.orderByFields) body.orderByFields = options.orderByFields;
    if (options.geometry) body.geometry = options.geometry;
    if (options.geometryType) body.geometryType = options.geometryType;
    if (options.spatialRel) body.spatialRel = options.spatialRel;
    if (options.inSR) body.inSR = options.inSR;
    if (options.outSR) body.outSR = options.outSR;

    return this.postJson<QueryResult>(
      `/rest/services/${serviceName}/${serviceType}/${layerId}/query`,
      body
    );
  }

  /**
   * Returns the count of features matching a WHERE clause without fetching records.
   */
  async getFeatureCount(
    serviceName: string,
    serviceType: string,
    layerId: number,
    where?: string
  ): Promise<number> {
    const body: Record<string, string> = {
      where: where ?? "1=1",
      returnCountOnly: "true",
    };
    const result = await this.postJson<{ count: number }>(
      `/rest/services/${serviceName}/${serviceType}/${layerId}/query`,
      body
    );
    return result.count;
  }

  /**
   * Recursively lists all services across all folders.
   */
  private async listAllServices(): Promise<ServiceInfo[]> {
    const root = await this.listServices();
    const all: ServiceInfo[] = [...root.services];

    await Promise.all(
      root.folders.map(async (folder) => {
        try {
          const folderInfo = await this.listServices(folder);
          all.push(...folderInfo.services);
        } catch {
          // skip inaccessible folders
        }
      })
    );

    return all;
  }

  /**
   * Searches all services for layers whose name contains the given keyword
   * (case-insensitive). Returns enough info to call query_layer directly.
   */
  async findLayer(keyword: string): Promise<FindLayerResult[]> {
    const allServices = await this.listAllServices();
    const lowerKeyword = keyword.toLowerCase();
    const results: FindLayerResult[] = [];

    await Promise.all(
      allServices.map(async (service) => {
        try {
          const info = (await this.getServiceInfo(service.name, service.type)) as {
            layers?: Array<{ id: number; name: string; type?: string }>;
            tables?: Array<{ id: number; name: string; type?: string }>;
          };
          const entries = [...(info.layers ?? []), ...(info.tables ?? [])];
          for (const layer of entries) {
            if (layer.name.toLowerCase().includes(lowerKeyword)) {
              results.push({
                service_name: service.name,
                service_type: service.type,
                layer_id: layer.id,
                layer_name: layer.name,
                ...(layer.type ? { layer_type: layer.type } : {}),
              });
            }
          }
        } catch {
          // skip services that are not accessible or lack layer metadata
        }
      })
    );

    return results;
  }
}
