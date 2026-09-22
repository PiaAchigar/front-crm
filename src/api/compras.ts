import { apiFetch } from "./client";

/**
 * Los CINCO estados en que puede estar un servicio comprado. Se DERIVAN en el
 * backend a partir del turno y de la vigencia de la compra: no hay ninguna
 * columna que los guarde, así que no pueden quedar desincronizados.
 *
 * Sólo los tres primeros son *sesiones* — tienen turno, o sea fecha y hora.
 * `vencida` y `disponible` son servicios comprados que nunca llegaron a
 * agendarse: el tipo se llama `EstadoSesion` por herencia y el nombre le queda
 * chico.
 */
export type EstadoSesion = "consumida" | "perdida" | "agendada" | "vencida" | "disponible";

/**
 * Un servicio comprado. Con `appointmentStart` ES una sesión — el vocabulario
 * que fijó Pia: la sesión es un servicio con fecha y hora.
 */
export type ServicioComprado = {
  id: string;
  serviceId: string | null;
  serviceName: string | null;
  repeticion: number | null;
  orden: number | null;
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
  /** Si ya se le devolvió la plata de esta compra, y cuánta. */
  devuelta: boolean;
  /** La devolución exigía nota de crédito y sigue en borrador en el facturador.
   *  Es información, no una acción: la nota se emite desde el facturador. */
  notaDeCreditoPendiente?: boolean;
  devuelto: number;
  consumidas: number;
  /** Sesiones que la clienta perdió por no venir. Ya se cobraron. */
  perdidas: number;
  /** Consumidas + perdidas. */
  usadas: number;
  agendadas: number;
  disponibles: number;
  vencidas: number;
  pagado: number;
  saldo: number;
  saldada: boolean;
  servicios: ServicioComprado[];
};

export type OrigenVenta = "combo" | "depilacion" | "servicio" | "capacitacion";

/** Un item del catálogo, ya normalizado por el backend: los tres orígenes
 *  llegan con la misma forma para que la pantalla no aprenda tres modelos. */
export type ItemDeCatalogo = {
  origen: OrigenVenta;
  id: string;
  nombre: string;
  /** Sesiones del pack, si es un pack. NULL en los combos genéricos. */
  packSesiones: number | null;
  /** El descuento que aplica ese pack, para poder decirlo en pantalla. */
  packDescuentoPct: number | null;
  precioDesde: number;
};

export type PromoVendible = {
  id: string;
  name: string | null;
  discountPercentage: number | null;
  discountAmount: number | null;
  /** `"paquete"` se vende entera de un saque; cualquier otro valor (o null)
   *  es un descuento sobre una cosa elegida. */
  promotionType: string | null;
  /** El precio del paquete completo. Sólo cuando `promotionType === "paquete"`. */
  precioDelPaquete: number | null;
  /** A qué le sirve esta promo. El desplegable de Vender filtra por esto:
   *  antes se ofrecían todas, sin importar lo elegido. */
  destinos: { tipo: "servicio" | "combo" | "depilacion"; id: string; cantidad: number }[];
};

export type Catalogo = {
  combos: ItemDeCatalogo[];
  depilacion: ItemDeCatalogo[];
  servicios: ItemDeCatalogo[];
  capacitaciones: ItemDeCatalogo[];
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
  trainingId: string | null;
  /** Sólo viene en `true` cuando se cotizó un paquete: los cuatro orígenes de
   *  arriba llegan en `null` y no hay que rearmar nada para vender. */
  esPaquete?: boolean;
};

export function fetchCompras(customerId: string): Promise<Compra[]> {
  return apiFetch(`/api/crm/customers/${customerId}/purchases`);
}

export function fetchCatalogoVendible(): Promise<Catalogo> {
  return apiFetch("/api/crm/purchases/catalog");
}

export function cotizarVenta(
  input:
    | { origen: OrigenVenta; id: string; sessions: number; promotionId?: string | null }
    // Un paquete no tiene "origen" suelto: lo que lleva sale de la promo.
    | { origen: "paquete"; promotionId: string },
): Promise<Cotizacion> {
  return apiFetch("/api/crm/purchases/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function venderCompra(
  input: Cotizacion & { customerId: string; notes?: string | null; usarSaldo?: number },
) {
  // `pagadoConSaldo` dice cuánto cubrió el saldo a favor, que es lo que el
  // paso de cobro necesita para saber qué falta.
  return apiFetch<Compra & { pagadoConSaldo?: number }>("/api/crm/purchases", {
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

/** Qué cuelga de una compra y si por eso se puede borrar. */
export type ImpactoDeBorrado = {
  pagos: number;
  montoPagado: number;
  facturas: number;
  sesionesAgendadas: number;
  sesionesConsumidas: number;
  movimientosDeSaldo: number;
  motivos: string[];
  borrable: boolean;
};

export function fetchImpactoDeBorrado(id: string): Promise<ImpactoDeBorrado> {
  return apiFetch(`/api/crm/purchases/${id}/delete-impact`);
}

export function eliminarCompra(id: string) {
  return apiFetch<void>(`/api/crm/purchases/${id}`, { method: "DELETE" });
}

/** Si a una compra se le puede devolver la plata, cuánta, y si no por qué. */
export type ChequeoDeDevolucion = {
  cancelada: boolean;
  pagado: number;
  finalAmount: number;
  usadas: number;
  saldoDisponible: number;
  yaDevuelta: boolean;
  motivos: string[];
  sePuede: boolean;
  monto: number;
};

export function fetchChequeoDeDevolucion(id: string): Promise<ChequeoDeDevolucion> {
  return apiFetch(`/api/crm/purchases/${id}/refund-check`);
}

export function devolverPlata(id: string, notes?: string | null) {
  return apiFetch<{ monto: number }>(`/api/crm/purchases/${id}/refund`, {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? null }),
  });
}

/** Un saldo a favor que se venció, con el detalle de dónde salió. */
export type SaldoVencido = {
  customerId: string;
  contactId: string | null;
  nombre: string | null;
  vencido: number;
  vigente: number;
  origenes: {
    /** Lo que queda del lote: es lo que se pasaría a caja. */
    monto: number;
    /** Lo que se acreditó en su momento. Distinto de `monto` si la clienta
     *  gastó una parte, y sin él ese número no se puede explicar. */
    original: number;
    acreditadoEl: string;
    venceEl: string | null;
    detalle: string | null;
  }[];
};

export function fetchSaldosVencidos(): Promise<{ clientes: SaldoVencido[]; total: number }> {
  return apiFetch("/api/crm/credits/expired");
}

export function vencerSaldo(customerId: string) {
  return apiFetch<{ monto: number; detalle: string }>(
    `/api/crm/credits/${customerId}/expire`,
    { method: "POST" },
  );
}

/** Una acreditación viva, con su fecha y su historial de aplazos. */
export type LoteDeSaldo = {
  id: string | null;
  /** Lo que queda: es lo que se pasaría a caja. */
  monto: number;
  /** Lo que se acreditó. Distinto de `monto` si gastó una parte. */
  original: number;
  acreditadoEl: string;
  venceEl: string | null;
  vencido: boolean;
  detalle: string | null;
  /** Cada vez que se corrió la fecha, en texto. */
  aplazos: string[];
};

export type EstadoDeSaldo = {
  vigente: number;
  vencido: number;
  total: number;
  lotes: LoteDeSaldo[];
};

export function fetchSaldoDeCliente(customerId: string): Promise<EstadoDeSaldo> {
  return apiFetch(`/api/crm/credits/${customerId}`);
}

/** Corre para adelante el vencimiento de uno o varios saldos. */
export function aplazarVencimiento(input: {
  customerId: string;
  movimientoIds: string[];
  nuevaFecha: string;
  motivo?: string;
}) {
  return apiFetch<{ aplazados: number; nuevaFecha: string }>(
    `/api/crm/credits/${input.customerId}/postpone`,
    {
      method: "POST",
      body: JSON.stringify({
        movimientoIds: input.movimientoIds,
        nuevaFecha: input.nuevaFecha,
        motivo: input.motivo,
      }),
    },
  );
}

export type MedioDePago = "cash" | "bank_transfer" | "mercadopago" | "debit_card" | "credit_card";

/** Cuánto falta cobrar de una compra y cuál es el mínimo de ahora. */
export type EstadoDeCobro = {
  pendiente: number;
  minimo: number;
  sugerido: number;
  faltaElMinimo: boolean;
};

/**
 * Cuánto falta cobrar de una compra que YA se vendió.
 *
 * La cuenta la hace el backend y no la pantalla: el mínimo del primer pago es
 * el 40% del ACUMULADO (regla 5.10) y espejarlo acá sería una segunda copia
 * que se desincroniza sola.
 */
export function fetchEstadoDeCobro(id: string): Promise<EstadoDeCobro> {
  return apiFetch(`/api/crm/purchases/${id}/checkout-state`);
}

export function cobrarCompra(
  id: string,
  input: { amount: number; method: MedioDePago; wantsInvoice: boolean; notes?: string | null },
): Promise<EstadoDeCobro> {
  return apiFetch(`/api/crm/purchases/${id}/checkout`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
