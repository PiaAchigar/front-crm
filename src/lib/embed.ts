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

export function useEmbedToken(): boolean {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (DASHBOARD_ORIGIN && e.origin !== DASHBOARD_ORIGIN) return;
      const data = e.data as { type?: string; accessToken?: unknown } | null;
      if (data?.type === TOKEN_MSG && typeof data.accessToken === "string") {
        setAuthToken(data.accessToken);
        setReady(true);
        void qc.invalidateQueries();
      }
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: READY_MSG }, DASHBOARD_ORIGIN ?? "*");

    return () => window.removeEventListener("message", onMessage);
  }, [qc]);

  return ready;
}
