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
 * quiere: con o sin +54, con el 0 de larga distancia, con el 00, con el 9 de
 * celular adelante, o con el 15 viejo después del 11. wa.me quiere
 * 549 + área + número (el 9 es el de celular en Argentina).
 */
export function enlaceDeWhatsApp(telefono: string | null): string | null {
  let d = (telefono ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  d = d.replace(/^0/, "");
  if (d.length === 11 && d.startsWith("9")) d = d.slice(1);
  if (d.length === 12 && d.startsWith("1115")) d = "11" + d.slice(4);
  if (d.length !== 10) return null;
  return `https://wa.me/549${d}`;
}

/**
 * El redactor de Gmail en el navegador, con la clienta, el asunto y su
 * consulta citada. No `mailto:`: abre el programa de mail de la compu, y en
 * la del local no hay ninguno configurado, así que el botón no hacía nada.
 */
/** La cuenta de Gmail del local. info@piubellaesteticapilates.com.ar es un
 *  alias que entra acá. Va como `authuser` para que el redactor abra en esta
 *  cuenta aunque el navegador tenga otras abiertas. */
const GMAIL_DEL_LOCAL = "piubellatalar@gmail.com";

export function enlaceDeGmail(
  email: string,
  { nombre, consulta }: { nombre: string | null; consulta: string | null },
): string {
  const saludo = nombre?.trim() ? `Hola ${nombre.trim()},` : "Hola,";
  const cita = consulta?.trim()
    ? "\n\n" + consulta.trim().split("\n").map((l) => `> ${l}`).join("\n")
    : "";
  const params = new URLSearchParams({
    authuser: GMAIL_DEL_LOCAL,
    view: "cm",
    fs: "1",
    to: email,
    su: "Tu consulta en Piu Bella",
    body: `${saludo}\n\n${cita}`,
  });
  return `https://mail.google.com/mail/?${params}`;
}
