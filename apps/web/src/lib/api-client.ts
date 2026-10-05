export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const TOKEN_KEY = "waypoint.api.tokens.v1";

export interface ApiTokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

function availableStorages(): Storage[] {
  if (typeof window === "undefined") return [];
  return [window.sessionStorage, window.localStorage];
}

function readTokens(): { tokens: ApiTokens; storage: Storage } | null {
  for (const storage of availableStorages()) {
    const raw = storage.getItem(TOKEN_KEY);
    if (!raw) continue;
    try {
      const value: unknown = JSON.parse(raw);
      if (
        typeof value === "object" && value !== null &&
        "accessToken" in value && typeof value.accessToken === "string" &&
        "refreshToken" in value && typeof value.refreshToken === "string"
      ) {
        return { tokens: value as ApiTokens, storage };
      }
    } catch {
      storage.removeItem(TOKEN_KEY);
    }
  }
  return null;
}

export function storeApiTokens(tokens: ApiTokens, remember: boolean) {
  clearApiTokens();
  (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearApiTokens() {
  for (const storage of availableStorages()) storage.removeItem(TOKEN_KEY);
}

export function hasApiTokens() {
  return Boolean(readTokens());
}

async function parseError(response: Response) {
  let details: unknown;
  try {
    details = await response.json();
  } catch {
    details = null;
  }
  const message =
    typeof details === "object" && details !== null &&
    "message" in details && typeof details.message === "string"
      ? details.message
      : `Request failed with status ${response.status}`;
  return new ApiError(message, response.status, details);
}

async function refreshAccessToken() {
  const stored = readTokens();
  if (!stored) return null;
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: stored.tokens.refreshToken }),
  });
  if (!response.ok) {
    clearApiTokens();
    return null;
  }
  const body = (await response.json()) as { accessToken: string };
  const tokens = { ...stored.tokens, accessToken: body.accessToken };
  stored.storage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  return tokens.accessToken;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retryAfterRefresh = true): Promise<T> {
  const stored = readTokens();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (stored?.tokens.accessToken) headers.set("Authorization", `Bearer ${stored.tokens.accessToken}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "The Waypoint API is unreachable.", 0);
  }
  if (response.status === 401 && retryAfterRefresh && stored?.tokens.refreshToken) {
    if (await refreshAccessToken()) return apiRequest<T>(path, init, false);
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function publicApiRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "The Waypoint API is unreachable.", 0);
  }
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}
