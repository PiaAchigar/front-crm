import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthToken } from "./auth-token";

/**
 * Modo embebido: el CRM correría dentro de un <iframe> del dashboard (todavía
 * no está wireado en front-dashboard — eso queda para cuando el dashboard sume
 * la sección CRM). Se activa con `?embed=1` en la URL.
 */
export const isEmbedded =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("embed") === "1";

export const DASHBOARD_ORIGIN = import.meta.env.VITE_DASHBOARD_ORIGIN as
  | string
  | undefined;

const READY_MSG = "piubella:crm:ready";
const TOKEN_MSG = "piubella:crm:token";

export function useEmbedToken(): { ready: boolean; token: string | null } {
  const qc = useQueryClient();
  const [state, setState] = useState<{ ready: boolean; token: string | null }>({
    ready: false,
    token: null,
  });

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (DASHBOARD_ORIGIN && e.origin !== DASHBOARD_ORIGIN) return;
      const data = e.data as { type?: string; accessToken?: unknown } | null;
      if (data?.type === TOKEN_MSG && typeof data.accessToken === "string") {
        setAuthToken(data.accessToken);
        setState({ ready: true, token: data.accessToken });
        void qc.invalidateQueries();
      }
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: READY_MSG }, DASHBOARD_ORIGIN ?? "*");

    return () => window.removeEventListener("message", onMessage);
  }, [qc]);

  return state;
}

const AGENDAR_MSG = "piubella:crm:agendar";

/**
 * Pedirle al dashboard que abra la agenda para agendar este servicio.
 *
 * El CRM corre dentro de un `<iframe>`, así que no puede navegar al dashboard
 * por su cuenta: el navegador se lo impide entre origins distintos. Se lo pide
 * por el mismo canal `postMessage` del handshake del token.
 *
 * **Manda la clienta y el servicio aunque hoy no se usen.** El dashboard, por
 * ahora, sólo abre la agenda. El paso que sigue —abrir el turno nuevo ya
 * cargado con estos dos— vive todo del lado del dashboard y la agenda; si el
 * mensaje no los trajera, sumarlos después obligaría a tocar los tres repos
 * en vez de uno.
 *
 * Fuera del iframe no hace nada: el CRM suelto no sabe dónde vive la agenda.
 */
export function pedirAgendar(datos: { customerId: string; serviceId: string | null }): void {
  if (!isEmbedded) return;
  window.parent.postMessage({ type: AGENDAR_MSG, ...datos }, DASHBOARD_ORIGIN ?? "*");
}
