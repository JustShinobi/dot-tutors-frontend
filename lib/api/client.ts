/**
 * Thin HTTP client for the backend.
 *
 * Components never call `fetch` directly. Centralising it here means the error contract —
 * `{"error": {code, message, request_id}}` — is decoded in one place, and every screen can show
 * the backend's own message instead of inventing its own wording.
 */

import type { ApiErrorBody } from "./errors";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly fields: { field: string; message: string }[];

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null = null,
    fields: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.fields = fields;
  }

  /** True when the caller should send the user back to the login screen. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    // A network failure has no HTTP status. It gets its own code so screens can suggest
    // "check that the backend is running" instead of showing a raw TypeError.
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Nao foi possivel falar com a API. Verifique se o backend esta rodando.",
    );
  }

  if (response.status === 204) return undefined as T;

  const payload = await readJson(response);

  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  return payload as T;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { code: "INVALID_RESPONSE", message: text.slice(0, 200) } };
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const body = payload as ApiErrorBody | null;
  const error = body?.error;

  return new ApiError(
    status,
    error?.code ?? "HTTP_ERROR",
    error?.message ?? `A API respondeu com status ${status}.`,
    error?.request_id ?? null,
    error?.details?.fields ?? [],
  );
}
