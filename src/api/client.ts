import { getAuthToken } from "../lib/auth-token";

const API_URL = import.meta.env.VITE_API_URL as string;
/** Fallback de auth para correr el CRM standalone en dev (sin el dashboard). */
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

/** El backend devuelve `{ error: string }` para errores de negocio (badRequest,
 *  notFound, etc.), pero `@hono/zod-validator` devuelve `{ success: false, error:
 *  <ZodError> }` en fallos de validación — sin esto, ese caso rendería
 *  "[object Object]" en vez de un mensaje legible. */
function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const { error } = body as { error?: unknown };
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: { message?: string }[] }).issues;
    if (issues?.[0]?.message) return issues[0].message;
  }
  return undefined;
}

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
    throw new Error(extractErrorMessage(body) ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
