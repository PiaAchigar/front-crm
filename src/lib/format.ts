// Punto único de conversión de fechas del CRM, espejo de
// front-agenda/src/lib/format.ts, front-facturador y front-dashboard.
//
// La zona va explícita en vez de depender de la del navegador: así una fecha se
// ve igual en la PC del estudio, en un celular en viaje o en un servidor.
const TZ = "America/Argentina/Buenos_Aires";

/** "DD/MM/AAAA" a partir de "YYYY-MM-DD" (fecha pura, sin zona horaria). */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** "DD/MM/AAAA" en hora local ART a partir de un instante ISO UTC. */
export function formatDateTimeToDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/** "DD/MM/AAAA HH:MM" en hora local ART a partir de un instante ISO UTC. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
