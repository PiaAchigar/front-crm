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
 * Cuántos servicios se usaron, y la barra partida en dos tramos.
 *
 * **Usados = hechos + perdidos.** Una clienta que no vino perdió ese servicio
 * y no lo puede reagendar (regla de Laura, 2026-09-09), así que para ella está
 * tan usado como si se lo hubiera hecho.
 *
 * **Pero "usado" junta dos cosas muy distintas**, y la barra era el único lugar
 * donde se veían iguales — justamente el que se lee sin leer. Por eso devuelve
 * dos porcentajes: verde lo hecho, rojo lo perdido (pedido de Pia, 2026-09-11).
 *
 * **Agendado NO cuenta**: el turno puede cancelarse y el servicio vuelve solo a
 * *a agendar*. Contarlo acá haría que la barra retroceda, que es exactamente la
 * señal de que se estaba midiendo la cosa equivocada.
 *
 * El denominador son los SERVICIOS, no `sessionsTotal`: un combo de 2 servicios
 * tiene `sessionsTotal` 1 y dos cosas que agendar.
 */
export function progresoDeSesiones(compra: Compra): {
  texto: string;
  porcentajeHecho: number;
  porcentajePerdido: number;
} {
  const total = compra.servicios.length;
  const hechos = compra.consumidas;
  const perdidos = compra.perdidas;
  const usados = compra.usadas ?? hechos + perdidos;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  // "usado" es participio y modifica a "servicios": las dos terminaciones en
  // plural concuerdan con TOTAL, no con `usados` — "1 de 3 servicios usados",
  // nunca "servicios usado" (bug fijado en un test, corregido 2026-09-14).
  const plural = total === 1 ? "" : "s";
  return {
    texto: `${usados} de ${total} servicio${plural} usado${plural}`,
    porcentajeHecho: pct(hechos),
    porcentajePerdido: pct(perdidos),
  };
}

const SESIONES: Record<EstadoSesion, Etiqueta> = {
  // "Hecho" y no "Consumida": lo que se hizo fue el servicio, y así lo dice
  // Laura en el mostrador.
  consumida: { texto: "Hecho", clase: "bg-emerald-100 text-emerald-800" },
  // Rojo y no gris: no es un estado neutro, es plata que la clienta perdió y
  // por la que va a preguntar.
  perdida: { texto: "Perdido", clase: "bg-rose-100 text-rose-800" },
  agendada: { texto: "Agendado", clase: "bg-sky-100 text-sky-800" },
  disponible: { texto: "A agendar", clase: "bg-surface-high text-ink-soft" },
  vencida: { texto: "Vencido", clase: "bg-amber-100 text-amber-800" },
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

/**
 * Cuánto saldo a favor entra en una compra. Espejo de `planDePagoConSaldo` del
 * worker, sólo para MOSTRAR: el backend vuelve a hacer la cuenta y es el que
 * manda. Acá sirve para que el número aparezca sin ir y volver al servidor en
 * cada tecla.
 *
 * Los dos topes son los que importan: no más saldo del que hay, y no más que
 * el precio — aplicar $200.000 a una compra de $166.000 dejaría un pago de más
 * que después habría que devolver.
 */
export function saldoQueEntra(precio: number, saldoDisponible: number): number {
  return Math.min(Math.max(0, saldoDisponible), Math.max(0, precio));
}
