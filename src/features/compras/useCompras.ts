import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Cotizacion,
  type MedioDePago,
  type OrigenVenta,
  cancelarCompra,
  cobrarCompra,
  cotizarVenta,
  devolverPlata,
  eliminarCompra,
  fetchCatalogoVendible,
  fetchChequeoDeDevolucion,
  fetchCompras,
  fetchImpactoDeBorrado,
  aplazarVencimiento,
  fetchSaldoDeCliente,
  fetchSaldosVencidos,
  venderCompra,
  vencerSaldo,
} from "../../api/compras";

/**
 * Todo lo que queda viejo cuando se mueve plata de una clienta.
 *
 * Va en una sola función y no repetido en cada hook porque el bug fue
 * exactamente ese: al agregar la card de saldo, las mutaciones que ya existían
 * siguieron invalidando sólo las compras, y Laura tenía que recargar la página
 * para ver el saldo a favor después de cancelar o devolver (2026-09-10).
 *
 * Las cuatro cosas se tocan entre sí: cancelar una compra acredita saldo, ese
 * saldo puede estar vencido —y entonces cambia el aviso de la pantalla de
 * Clientes—, y el `credit_balance` que muestra la ficha también se mueve.
 */
function invalidarPlataDe(qc: QueryClient, customerId: string | null) {
  qc.invalidateQueries({ queryKey: ["compras", customerId] });
  qc.invalidateQueries({ queryKey: ["saldo", customerId] });
  qc.invalidateQueries({ queryKey: ["saldos-vencidos"] });
  qc.invalidateQueries({ queryKey: ["contact"] });
}

export function useCompras(customerId: string | null) {
  return useQuery({
    queryKey: ["compras", customerId],
    queryFn: () => fetchCompras(customerId!),
    enabled: !!customerId,
  });
}

/**
 * El catálogo de lo que se puede vender, pedido de nuevo cada vez que se abre
 * la pantalla de venta.
 *
 * Antes se guardaba fresco media hora para no pedir 120 servicios en cada
 * apertura. El razonamiento tenía un agujero: el catálogo se carga en el
 * DASHBOARD y se vende acá, son dos aplicaciones distintas, así que el CRM no
 * se entera nunca de que cambió. Laura cargaba un combo, venía a venderlo y el
 * modal le decía "Todavía no hay ninguno cargado en el catálogo" — durante
 * media hora, sin más salida que recargar la pestaña a mano. Pasó de verdad
 * (2026-09-10).
 *
 * `staleTime: 0` no significa esperar: React Query pinta al toque lo que tenía
 * guardado y pide la versión nueva por detrás. Se conserva entonces lo que
 * buscaba la media hora —que no haya pantalla en blanco— sin quedarse con un
 * catálogo viejo.
 */
export function useCatalogoVendible(enabled: boolean) {
  return useQuery({
    queryKey: ["catalogo-vendible"],
    queryFn: fetchCatalogoVendible,
    enabled,
    staleTime: 0,
  });
}

/**
 * La cotización de lo que está elegido en este momento.
 *
 * Es una query y no una mutación a propósito: al cambiar las sesiones o la
 * promo el precio tiene que actualizarse solo, sin que nadie apriete nada.
 */
export function useCotizacion(input: {
  origen: OrigenVenta | null;
  id: string | null;
  sessions: number;
  promotionId: string | null;
}) {
  return useQuery({
    queryKey: ["cotizacion", input],
    queryFn: () =>
      cotizarVenta({
        origen: input.origen!,
        id: input.id!,
        sessions: input.sessions,
        promotionId: input.promotionId,
      }),
    enabled: !!input.origen && !!input.id && input.sessions > 0,
    retry: false,
  });
}

export function useVender(customerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Cotizacion & { notes?: string | null; usarSaldo?: number }) =>
      venderCompra({ ...input, customerId: customerId! }),
    // Vender puede consumir saldo a favor, así que la card de saldo también
    // queda vieja.
    onSuccess: () => invalidarPlataDe(qc, customerId),
  });
}

export function useCancelarCompra(customerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string | null }) =>
      cancelarCompra(id, reason),
    onSuccess: () => invalidarPlataDe(qc, customerId),
  });
}

/** Se consulta al abrir el cartel. El backend lo vuelve a calcular al borrar:
 *  entre el preview y la confirmación le puede haber entrado un cobro. */
export function useImpactoDeBorrado(id: string | null) {
  return useQuery({
    queryKey: ["compra-delete-impact", id],
    queryFn: () => fetchImpactoDeBorrado(id!),
    enabled: !!id,
    // Sin caché: lo que importa es el estado de ahora, no el de hace un rato.
    staleTime: 0,
  });
}

export function useEliminarCompra(customerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarCompra(id),
    onSuccess: () => invalidarPlataDe(qc, customerId),
  });
}

/** Se consulta al abrir el cartel. El backend lo rehace al devolver: entre el
 *  preview y la confirmación la clienta pudo haber usado el saldo en otra
 *  compra. */
export function useChequeoDeDevolucion(id: string | null) {
  return useQuery({
    queryKey: ["compra-refund-check", id],
    queryFn: () => fetchChequeoDeDevolucion(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useDevolverPlata(customerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string | null }) => devolverPlata(id, notes),
    onSuccess: () => invalidarPlataDe(qc, customerId),
  });
}

export function useSaldosVencidos() {
  return useQuery({ queryKey: ["saldos-vencidos"], queryFn: fetchSaldosVencidos });
}

export function useVencerSaldo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => vencerSaldo(customerId),
    onSuccess: (_r, customerId) => invalidarPlataDe(qc, customerId),
  });
}

export function useSaldoDeCliente(customerId: string | null) {
  return useQuery({
    queryKey: ["saldo", customerId],
    queryFn: () => fetchSaldoDeCliente(customerId!),
    enabled: !!customerId,
  });
}

export function useAplazarVencimiento(customerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { movimientoIds: string[]; nuevaFecha: string; motivo?: string }) =>
      aplazarVencimiento({ customerId: customerId!, ...input }),
    // El aviso de la pantalla de Clientes se arma de lo mismo: si no se
    // invalida, sigue nombrando a una clienta que ya no tiene nada vencido.
    onSuccess: () => invalidarPlataDe(qc, customerId),
  });
}

export function useCobrarCompra(customerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      amount: number;
      method: MedioDePago;
      wantsInvoice: boolean;
      notes?: string | null;
    }) => cobrarCompra(input.id, input),
    onSuccess: () => invalidarPlataDe(qc, customerId),
  });
}
