import { getAuthToken } from "../lib/auth-token";

const API_URL = import.meta.env.VITE_API_URL as string;
/** Fallback de auth para correr el CRM standalone en dev (sin el dashboard). */
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  // Embebido en el dashboard: el host manda el JWT del staff (rol real) por
  // postMessage → header `Authorization`. Standalone (dev): cae al API key.
  const auth: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : API_KEY
      ? { "x-api-key": API_KEY }
      : {};

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
