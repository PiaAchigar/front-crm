import { apiFetch } from "./client";

/** Los cuatro estados de una sesión. Se DERIVAN en el backend a partir del
 *  turno y de la vigencia de la compra: no hay ninguna columna que los guarde,
 *  así que no pueden quedar desincronizados. */
export type EstadoSesion = "consumida" | "agendada" | "vencida" | "disponible";

export type SesionDeCompra = {
  id: string;
  sessionNumber: number | null;
  appointmentId: string | null;
  appointmentStart: string | null;
  consumedAt: string | null;
  estado: EstadoSesion;
};

export type Compra = {
  id: string;
  customerId: string | null;
  comboId: string | null;
  serviceId: string | null;
  depilationComboId: string | null;
  /** Congelada al vender: si mañana se renombra el combo, esto no cambia. */
  description: string | null;
  sessionsTotal: number | null;
  baseAmount: number;
  discountedAmount: number;
  finalAmount: number;
  promotionId: string | null;
  promotionName: string | null;
  purchasedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  // Derivados, calculados por el backend en cada lectura.
  consumidas: number;
  agendadas: number;
  disponibles: number;
  vencidas: number;
  pagado: number;
  saldo: number;
  saldada: boolean;
  sessions: SesionDeCompra[];
};

export type OrigenVenta = "combo" | "depilacion" | "servicio";

/** Un item del catálogo, ya normalizado por el backend: los tres orígenes
 *  llegan con la misma forma para que la pantalla no aprenda tres modelos. */
export type ItemDeCatalogo = {
  origen: OrigenVenta;
  id: string;
  nombre: string;
  /** Sesiones del pack, si es un pack. NULL en los combos genéricos. */
  packSesiones: number | null;
  precioDesde: number;
};

export type PromoVendible = {
  id: string;
  name: string | null;
  discountPercentage: number | null;
  discountAmount: number | null;
};

export type Catalogo = {
  combos: ItemDeCatalogo[];
  depilacion: ItemDeCatalogo[];
  servicios: ItemDeCatalogo[];
  promociones: PromoVendible[];
};

/** Lo que devuelve cotizar. Va tal cual al POST de venta: son los montos que
 *  se vieron en pantalla y son los que se congelan. */
export type Cotizacion = {
  description: string;
  sessionsTotal: number;
  baseAmount: number;
  discountedAmount: number;
  finalAmount: number;
  promotionId: string | null;
  expiresAt: string | null;
  comboId: string | null;
  depilationComboId: string | null;
  serviceId: string | null;
};

export function fetchCompras(customerId: string): Promise<Compra[]> {
  return apiFetch(`/api/crm/customers/${customerId}/purchases`);
}

export function fetchCatalogoVendible(): Promise<Catalogo> {
  return apiFetch("/api/crm/purchases/catalog");
}

export function cotizarVenta(input: {
  origen: OrigenVenta;
  id: string;
  sessions: number;
  promotionId?: string | null;
}): Promise<Cotizacion> {
  return apiFetch("/api/crm/purchases/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function venderCompra(input: Cotizacion & { customerId: string; notes?: string | null }) {
  return apiFetch<Compra>("/api/crm/purchases", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelarCompra(id: string, reason?: string | null) {
  return apiFetch<Compra>(`/api/crm/purchases/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
}
