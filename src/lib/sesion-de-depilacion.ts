import type { ServicioComprado } from "../api/compras";

/**
 * Cómo se llama una línea en la tabla de la ficha. En depilación cada línea es
 * una SESIÓN del pack (no una zona): "Sesión 2 de 6". El resto, como siempre.
 */
export function nombreDeLaLinea(s: ServicioComprado, sesionesTotales: number | null): string {
  if (s.depilationComboId) {
    const n = s.repeticion ?? 1;
    return sesionesTotales ? `Sesión ${n} de ${sesionesTotales}` : `Sesión ${n}`;
  }
  return s.serviceName ?? "—";
}

/** "Pierna entera, Axilas, 1 a elección". */
export function textoDeZonasDelPack(zonas: { nombre: string; cantidad: number }[]): string {
  return zonas
    .map((z) => (z.nombre === "Zona a elección" ? `${z.cantidad} a elección` : z.nombre))
    .join(", ");
}
