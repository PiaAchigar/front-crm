/**
 * Cómo se agrupan los servicios comprados en la ficha de la clienta.
 *
 * Vive en `lib/` y no dentro de la card por una razón concreta: importar un
 * componente desde un test `.ts` arrastra el contexto de Supabase y el test
 * revienta con "supabaseUrl is required". Pasó con `listar()` en el dashboard.
 */

import type { ServicioComprado } from "../api/compras";

export type GrupoDeServicios = {
  /** `null` cuando no hay nada que titular: un solo grupo, o un solo servicio. */
  titulo: string | null;
  servicios: ServicioComprado[];
};

/**
 * Agrupa por vuelta del pack, pero sólo cuando agrupar aporta algo.
 *
 * - Un solo servicio distinto (pack de depilación, servicio suelto): lista
 *   plana, igual que antes de V3b. Nada de ruido donde no hace falta.
 * - Dos o más servicios distintos: un grupo por vuelta.
 * - Una sola vuelta: se agrupa igual, pero sin encabezado — titular un único
 *   grupo es ruido.
 */
export function agruparServicios(
  servicios: readonly ServicioComprado[],
): GrupoDeServicios[] {
  if (servicios.length === 0) return [];

  const distintos = new Set(servicios.map((s) => s.serviceId ?? s.serviceName ?? ""));
  if (distintos.size <= 1) {
    return [{ titulo: null, servicios: [...servicios] }];
  }

  const porVuelta = new Map<number, ServicioComprado[]>();
  for (const s of servicios) {
    const v = s.repeticion ?? 1;
    const grupo = porVuelta.get(v);
    if (grupo) grupo.push(s);
    else porVuelta.set(v, [s]);
  }

  const vueltas = [...porVuelta.keys()].sort((a, b) => a - b);
  const unaSola = vueltas.length === 1;
  return vueltas.map((v, i) => ({
    titulo: unaSola ? null : `Combo ${i + 1}`,
    servicios: porVuelta.get(v)!,
  }));
}
