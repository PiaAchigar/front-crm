import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthToken } from "./auth-token";

/**
 * Modo embebido: el CRM correría dentro de un <iframe> del dashboard (todavía
 * no está wireado en front-dashboard — eso queda para cuando el dashboard sume
 * la sección CRM). Se activa con `?embed=1` en la URL, o al estar dentro de un
 * iframe: el parámetro se pierde al navegar, y si se recarga sólo el iframe en
 * una subruta ya no está.
 */
export const isEmbedded =
  typeof window !== "undefined" &&
  (window.self !== window.top ||
    new URLSearchParams(window.location.search).get("embed") === "1");

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
 * Lo que necesita la agenda para abrir el turno nuevo ya cargado.
 *
 * Una línea de servicio normal se identifica por `serviceId`. Una línea de
 * depilación NO tiene servicio propio —su identidad es el pack
 * (`depilationComboId`, 1.55.0)— así que en su lugar manda `purchaseServiceId`:
 * la LÍNEA comprada de la que sale el turno, que es la que sabe de qué sesión
 * se trata, cuánto presupuesto de minutos trae y si está paga.
 */
export type PrefillAgendar =
  | { customerId: string; serviceId: string }
  | { customerId: string; purchaseServiceId: string };

/**
 * Pedirle al dashboard que abra la agenda para agendar este servicio (o esta
 * sesión de depilación).
 *
 * El CRM corre dentro de un `<iframe>`, así que no puede navegar al dashboard
 * por su cuenta: el navegador se lo impide entre origins distintos. Se lo pide
 * por el mismo canal `postMessage` del handshake del token.
 *
 * El dashboard escucha esto en `agendar-handoff.ts`, arma la URL del iframe
 * de la agenda con la clienta y el servicio/línea (mismos nombres que manda
 * acá), y la agenda los lee al montar (`prefillDesdeUrl`, en su propio
 * `lib/embed.ts`) para abrir el turno nuevo ya cargado — todo eso vive en los
 * otros dos repos, no en este archivo.
 *
 * Fuera del iframe no hace nada: el CRM suelto no sabe dónde vive la agenda.
 */
export function pedirAgendar(datos: PrefillAgendar): void {
  if (!isEmbedded) return;
  window.parent.postMessage({ type: AGENDAR_MSG, ...datos }, DASHBOARD_ORIGIN ?? "*");
}

const AVISOS_ESTADO_MSG = "piubella:crm:avisos-estado";
const AVISOS_SILENCIAR_MSG = "piubella:crm:avisos-silenciar";
const VIENDO_MSG = "piubella:crm:viendo";
const AVISOS_PEDIR_ESTADO_MSG = "piubella:crm:avisos-pedir-estado";
const ABRIR_MSG = "piubella:crm:abrir";

/**
 * El dashboard le cuenta al CRM si los avisos de mensajes nuevos están
 * silenciados, para que el botón del Inbox diga lo correcto. Mismo canal y
 * misma verificación de origin que el handshake del token. Devuelve la
 * función para dejar de escuchar.
 *
 * Después de registrar el listener le PIDE el estado al dashboard
 * (`avisos-pedir-estado`): así no depende de que otro `ready` caiga justo
 * después de montar.
 */
export function escucharEstadoAvisos(cb: (silenciado: boolean) => void): () => void {
  function onMessage(e: MessageEvent) {
    if (DASHBOARD_ORIGIN && e.origin !== DASHBOARD_ORIGIN) return;
    const data = e.data as { type?: string; silenciado?: unknown } | null;
    if (data?.type === AVISOS_ESTADO_MSG && typeof data.silenciado === "boolean") {
      cb(data.silenciado);
    }
  }
  window.addEventListener("message", onMessage);
  if (isEmbedded) {
    window.parent.postMessage({ type: AVISOS_PEDIR_ESTADO_MSG }, DASHBOARD_ORIGIN ?? "*");
  }
  return () => window.removeEventListener("message", onMessage);
}

/**
 * El dashboard pide abrir una conversación (tocaron un aviso con el CRM ya
 * abierto). Misma verificación de origin que el resto. Devuelve la función
 * para dejar de escuchar.
 */
export function escucharAbrirConversacion(cb: (conversationId: string) => void): () => void {
  function onMessage(e: MessageEvent) {
    if (DASHBOARD_ORIGIN && e.origin !== DASHBOARD_ORIGIN) return;
    const data = e.data as { type?: string; conversationId?: unknown } | null;
    if (data?.type === ABRIR_MSG && typeof data.conversationId === "string" && data.conversationId) {
      cb(data.conversationId);
    }
  }
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

/** Le pide al dashboard silenciar (o reactivar) los avisos. Fuera del iframe no hace nada. */
export function pedirSilenciarAvisos(silenciado: boolean): void {
  if (!isEmbedded) return;
  window.parent.postMessage(
    { type: AVISOS_SILENCIAR_MSG, silenciado },
    DASHBOARD_ORIGIN ?? "*",
  );
}

/** Le avisa al dashboard qué conversación está abierta (o `null`), para no avisar de esa. */
export function avisarConversacionAbierta(id: string | null): void {
  if (!isEmbedded) return;
  window.parent.postMessage({ type: VIENDO_MSG, conversationId: id }, DASHBOARD_ORIGIN ?? "*");
}
