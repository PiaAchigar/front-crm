import type { ItemDeCatalogo } from "../api/compras";

export type DestinoDePromo = {
  tipo: "servicio" | "combo" | "depilacion";
  id: string;
  cantidad: number;
};

export type FilaDeDesglose = { nombre: string; cantidad: number };

/** Una promo que se vende entera, no como descuento sobre una cosa. */
export function esPaquete(promo: { promotionType?: string | null }): boolean {
  return promo.promotionType === "paquete";
}

/**
 * Qué lleva un paquete, con los nombres ya resueltos.
 *
 * **No sale a buscar nada:** el catálogo de venta ya trae los servicios, los
 * combos y los packs, así que los nombres se resuelven contra las listas que
 * el modal tiene cargadas (spec §7). Una llamada más acá sería una llamada por
 * cada promo listada.
 */
export function desgloseDePromo(
  destinos: readonly DestinoDePromo[],
  catalogo: {
    // Sólo hace falta `id` y `nombre` para resolver el desglose: pedir el
    // `ItemDeCatalogo` completo obligaría a los tests a inventar campos
    // (`packSesiones`, `precioDesde`, ...) que esta función ni mira.
    servicios: Pick<ItemDeCatalogo, "id" | "nombre">[];
    combos: Pick<ItemDeCatalogo, "id" | "nombre">[];
    depilacion: Pick<ItemDeCatalogo, "id" | "nombre">[];
    capacitaciones: Pick<ItemDeCatalogo, "id" | "nombre">[];
  },
): FilaDeDesglose[] {
  const porId = new Map<string, string>();
  for (const lista of [catalogo.servicios, catalogo.combos, catalogo.depilacion, catalogo.capacitaciones]) {
    for (const i of lista) porId.set(i.id, i.nombre);
  }
  return destinos.map((d) => ({
    // Un servicio archivado después de armar la promo deja de estar en el
    // catálogo. Decirlo es mejor que dibujar una fila en blanco.
    nombre: porId.get(d.id) ?? "(ya no está en el catálogo)",
    cantidad: d.cantidad,
  }));
}
