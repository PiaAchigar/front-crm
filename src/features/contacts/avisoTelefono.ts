import { diagnosticoTelefono, type MotivoTelefono } from "../../lib/telefono";

/** Primer problema que tienen el WhatsApp ID o el Teléfono cargados, o null si
 *  están vacíos o sirven. Un WhatsApp ID válido en otro formato (+54 9 11 …) no
 *  es problema: se normaliza al guardar. */
export function problemaDeNumero(whatsappId: string, phone: string): MotivoTelefono | null {
  for (const valor of [whatsappId, phone]) {
    if (!valor.trim()) continue;
    const d = diagnosticoTelefono(valor);
    if (!d.ok) return d.motivo;
  }
  return null;
}
