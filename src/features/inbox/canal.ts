import type { ChannelType } from "../../api/channels";
import { CHANNEL_META } from "../channels/channels.config";

/**
 * El canal de una conversación, para mostrarlo en el Inbox.
 *
 * "web" no es un canal que se configure (no está en Canales): son las
 * consultas del formulario de Contacto del sitio (2026-10-28). Por eso vive
 * acá y no en CHANNEL_META.
 */
export const CANAL_WEB = "web";

export function metaDeCanal(canal: string | null): { label: string; icon: string } | null {
  if (canal === CANAL_WEB) return { label: "Formulario de la web", icon: "🌐" };
  const meta = canal ? CHANNEL_META[canal as ChannelType] : undefined;
  return meta ? { label: meta.label, icon: meta.icon } : null;
}

/**
 * wa.me con el teléfono que escribió la clienta en la web, que viene como
 * quiere: con o sin +54, con el 0 de larga distancia, con el 00. wa.me quiere
 * 549 + área + número (el 9 es el de celular en Argentina).
 */
export function enlaceDeWhatsApp(telefono: string | null): string | null {
  let d = (telefono ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  d = d.replace(/^0/, "");
  if (d.length !== 10) return null;
  return `https://wa.me/549${d}`;
}
