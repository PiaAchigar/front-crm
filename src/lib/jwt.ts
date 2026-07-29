import type { Role } from "./permissions";

/** Decodifica el claim `app_metadata.role` de un JWT SIN verificar la firma.
 *  Es solo para gating de UI; la autorización real la hace el Worker. */
export function decodeRole(token: string | null): Role | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload)
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(""),
      ),
    );
    const role = (json?.app_metadata as { role?: string } | undefined)?.role;
    return (role as Role) ?? null;
  } catch {
    return null;
  }
}
