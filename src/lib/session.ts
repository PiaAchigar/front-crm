import { useEmbedToken } from "./embed";
import { decodeRole } from "./jwt";
import type { Role } from "./permissions";

/** Estado de sesión del CRM. Espera el JWT del host y decodifica el rol. */
export function useCrmSession(): { ready: boolean; role: Role | null } {
  const { ready, token } = useEmbedToken();
  return { ready, role: decodeRole(token) };
}
