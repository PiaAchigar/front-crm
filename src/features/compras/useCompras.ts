import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Cotizacion,
  type OrigenVenta,
  cancelarCompra,
  cotizarVenta,
  devolverPlata,
  eliminarCompra,
  fetchCatalogoVendible,
  fetchChequeoDeDevolucion,
  fetchCompras,
  fetchImpactoDeBorrado,
  fetchSaldosVencidos,
  venderCompra,
  vencerSaldo,
} from "../../api/compras";

export function useCompras(customerId: string | null) {
  return useQuery({
    queryKey: ["compras", customerId],
    queryFn: () => fetchCompras(customerId!),
    enabled: !!customerId,
  });
}

/** El catálogo cambia poco y la pantalla de venta se abre y se cierra mucho:
 *  media hora fresco evita pedir 120 servicios en cada apertura. */
export function useCatalogoVendible(enabled: boolean) {
  return useQuery({
    queryKey: ["catalogo-vendible"],
    queryFn: fetchCatalogoVendible,
    enabled,
    staleTime: 30 * 60 * 1000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras", customerId] });
      // La ficha muestra facturas y turnos que una venta todavía no toca, pero
      // sí queda vieja en cuanto se cobre desde otra pantalla.
      qc.invalidateQueries({ queryKey: ["contact"] });
    },
  });
}

export function useCancelarCompra(customerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string | null }) =>
      cancelarCompra(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compras", customerId] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compras", customerId] }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras", customerId] });
      // El saldo a favor vive en la ficha, y acaba de bajar.
      qc.invalidateQueries({ queryKey: ["contact"] });
    },
  });
}

export function useSaldosVencidos() {
  return useQuery({ queryKey: ["saldos-vencidos"], queryFn: fetchSaldosVencidos });
}

export function useVencerSaldo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => vencerSaldo(customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saldos-vencidos"] });
      // El saldo de la ficha acaba de cambiar.
      qc.invalidateQueries({ queryKey: ["contact"] });
    },
  });
}
