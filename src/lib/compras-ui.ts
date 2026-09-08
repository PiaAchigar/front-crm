/**
 * Cómo se leen las compras en pantalla. Lógica pura, sin React ni fetch.
 *
 * Nada de esto decide plata: los montos y los estados vienen calculados del
 * backend. Acá sólo se traducen a palabras y colores.
 */

import type { Compra, EstadoSesion } from "../api/compras";

/** Texto + las clases con las que se pinta. */
export type Etiqueta = { texto: string; clase: string };

/**
 * Pesos argentinos, redondeados al peso.
 *
 * Sin centavos a propósito: el negocio no cobra centavos y mostrarlos sólo
 * agrega ruido a una columna que se lee de un vistazo.
 */
export function pesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

/**
 * En qué anda la compra, en dos palabras.
 *
 * El orden importa: **cancelada** gana sobre todo (no hay nada que cobrar ni
 * que usar), después **vencida** —que se avisa aunque esté paga, porque una
 * compra pagada y sin usar es justo lo que Laura necesita ver—, y recién
 * después la plata.
 *
 * ⚠️ Las clases van escritas enteras y nunca armadas con template strings:
 * Tailwind lee el código como texto plano y una clase construida en runtime
 * no se compila nunca.
 */
export function estadoDeCompra(compra: Compra): Etiqueta {
  if (compra.cancelledAt) return { texto: "Cancelada", clase: "bg-surface-high text-ink-soft" };
  if (compra.vencidas > 0 && compra.disponibles === 0 && compra.agendadas === 0) {
    return { texto: "Vencida", clase: "bg-amber-100 text-amber-800" };
  }
  if (compra.saldo > 0) {
    return { texto: `Debe ${pesos(compra.saldo)}`, clase: "bg-rose-100 text-rose-800" };
  }
  return { texto: "Paga", clase: "bg-emerald-100 text-emerald-800" };
}

/**
 * Cuántas sesiones se usaron de verdad.
 *
 * **Agendada no cuenta como usada**: el turno puede cancelarse y la sesión
 * vuelve sola a disponible. Contarla acá haría que la barra retroceda, que es
 * exactamente la señal de que se estaba midiendo la cosa equivocada.
 */
export function progresoDeSesiones(compra: Compra): { texto: string; porcentaje: number } {
  const total = compra.sessionsTotal ?? 0;
  return {
    texto: `${compra.consumidas} de ${total} usadas`,
    porcentaje: total === 0 ? 0 : Math.round((compra.consumidas / total) * 100),
  };
}

const SESIONES: Record<EstadoSesion, Etiqueta> = {
  consumida: { texto: "Consumida", clase: "bg-emerald-100 text-emerald-800" },
  agendada: { texto: "Agendada", clase: "bg-sky-100 text-sky-800" },
  disponible: { texto: "Disponible", clase: "bg-surface-high text-ink-soft" },
  vencida: { texto: "Vencida", clase: "bg-amber-100 text-amber-800" },
};

export function etiquetaDeSesion(estado: EstadoSesion): Etiqueta {
  return SESIONES[estado];
}

/**
 * Cuánto se ahorró contra pagar todo suelto y sin promo.
 *
 * Es `base − final`, o sea las dos capas de descuento juntas. Nunca negativo:
 * si los montos vinieran al revés sería un recargo, y eso lo rechaza el
 * backend antes de guardar.
 */
export function ahorro(compra: Compra): number {
  return Math.max(0, compra.baseAmount - compra.finalAmount);
}

/** Si le quedan sesiones para agendar. Una compra cancelada no, aunque el
 *  contador de disponibles no se haya movido. */
export function puedeAgendar(compra: Compra): boolean {
  return !compra.cancelledAt && compra.disponibles > 0;
}
