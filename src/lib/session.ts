import { useEmbedToken, isEmbedded } from "./embed";
import { decodeRole } from "./jwt";
import type { Role } from "./permissions";

const HAS_API_KEY = Boolean(import.meta.env.VITE_API_KEY);

/** Estado de sesión del CRM. Embebido: espera el JWT del host y decodifica el
 *  rol. Standalone (dev, con api-key): rol admin y listo desde el arranque. */
export function useCrmSession(): { ready: boolean; role: Role | null } {
  const { ready, token } = useEmbedToken();

  if (!isEmbedded && HAS_API_KEY) {
    return { ready: true, role: "admin" };
  }
  return { ready, role: decodeRole(token) };
}
