import { diagnosticoTelefono, type MotivoTelefono } from "../../lib/telefono";

export type ProblemaDeNumero = { campo: "whatsappId" | "phone"; motivo: MotivoTelefono };

/** Primer problema del WhatsApp ID o del Teléfono, o null si están vacíos, sirven o no
 *  cambiaron respecto de `original` (si el número basura ya estaba cargado y se edita otra
 *  cosa, no se molesta). Un WhatsApp ID válido en otro formato (+54 9 11 …) no es problema:
 *  se normaliza al guardar. El WhatsApp ID va primero: es el que la API rechaza. */
export function problemaDeNumero(
  whatsappId: string,
  phone: string,
  original: { whatsappId?: string | null; phone?: string | null } = {},
): ProblemaDeNumero | null {
  const campos = [
    { campo: "whatsappId", valor: whatsappId, antes: original.whatsappId },
    { campo: "phone", valor: phone, antes: original.phone },
  ] as const;
  for (const { campo, valor, antes } of campos) {
    if (!valor.trim() || valor.trim() === (antes ?? "").trim()) continue;
    const d = diagnosticoTelefono(valor);
    if (!d.ok) return { campo, motivo: d.motivo };
  }
  return null;
}
