import { ReplitConnectors } from "@replit/connectors-sdk";

type JsonRecord = Record<string, unknown>;

export class SupabaseApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Supabase request failed with status ${status}`);
    this.name = "SupabaseApiError";
  }
}

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("supabase", path, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  let body: unknown = null;

  if (text.trim() !== "") {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new SupabaseApiError(response.status, body);
  }

  return body as T;
}

export async function selectRows<T>(
  table: string,
  query: Record<string, string> = {},
): Promise<T[]> {
  const params = new URLSearchParams({ select: "*", ...query });
  return request<T[]>(`/rest/v1/${table}?${params.toString()}`);
}

export async function callRpc<T>(
  functionName: string,
  body: JsonRecord,
): Promise<T> {
  return request<T>(`/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body,
  });
}