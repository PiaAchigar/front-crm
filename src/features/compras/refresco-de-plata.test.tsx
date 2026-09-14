import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ComprasCard } from "./ComprasCard";
import { SaldoCard } from "./SaldoCard";
import type { Compra } from "../../api/compras";

/**
 * Las dos cards viven juntas en la ficha y leen cosas distintas de la misma
 * plata. Cancelar una compra acredita saldo, así que si la mutación no
 * invalida las dos, una queda mostrando un número viejo.
 *
 * Bug reportado por Pia (2026-09-10): cancelaba un pack y tenía que recargar
 * la página para ver el saldo a favor. La causa era que `useCancelarCompra`
 * invalidaba sólo `["compras"]` — la card de saldo se agregó después y nadie
 * volvió sobre las mutaciones que ya existían.
 */

const pack: Compra = {
  id: "cp1",
  customerId: "cu1",
  comboId: null,
  serviceId: null,
  depilationComboId: "d1",
  trainingId: null,
  description: "Cuerpo Full — pack de 3",
  sessionsTotal: 3,
  baseAmount: 195000,
  discountedAmount: 166000,
  finalAmount: 166000,
  promotionId: null,
  promotionName: null,
  purchasedAt: "2026-09-08T15:00:00.000Z",
  expiresAt: null,
  cancelledAt: null,
  notes: null,
  devuelta: false,
  devuelto: 0,
  consumidas: 0,
  perdidas: 0,
  usadas: 0,
  agendadas: 0,
  disponibles: 3,
  vencidas: 0,
  pagado: 166000,
  saldo: 0,
  saldada: true,
  servicios: [],
} as unknown as Compra;

let saldoPedido = 0;
/** El saldo cambia recién después de cancelar, como en la vida real. */
let cancelado = false;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  saldoPedido = 0;
  cancelado = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (init?.method === "POST" && u.includes("/cancel")) {
        cancelado = true;
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      if (u.includes("/credits/")) {
        saldoPedido += 1;
        const monto = cancelado ? 166000 : 0;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            vigente: monto,
            vencido: 0,
            total: monto,
            lotes: cancelado
              ? [
                  {
                    id: "mv1",
                    monto,
                    original: monto,
                    acreditadoEl: "2026-09-10T10:00:00.000Z",
                    venceEl: "2026-12-10T10:00:00.000Z",
                    vencido: false,
                    detalle: 'Cancelación de "Cuerpo Full — pack de 3"',
                    aplazos: [],
                  },
                ]
              : [],
          }),
        };
      }
      // Las compras: la cancelada vuelve con fecha de cancelación.
      return {
        ok: true,
        status: 200,
        json: async () => [cancelado ? { ...pack, cancelledAt: "2026-09-10T10:00:00.000Z" } : pack],
      };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("cancelar una compra refresca el saldo sin recargar", () => {
  it("la card de saldo se entera sola", async () => {
    render(
      <>
        <SaldoCard customerId="cu1" />
        <ComprasCard customerId="cu1" saldoAFavor={0} />
      </>,
      { wrapper },
    );

    expect(await screen.findByText(/sin saldo a favor/i)).toBeInTheDocument();
    const pedidosAntes = saldoPedido;

    await userEvent.click(await screen.findByRole("button", { name: /cancelar/i }));
    const confirmar = await screen.findByRole("button", { name: /cancelar la compra/i });
    await userEvent.click(confirmar);

    // Sin la invalidación, esto no llega nunca: había que recargar la página.
    // Se busca el texto del LOTE, que sólo existe en la card de saldo — el
    // monto solo aparece también en la card de compras.
    await waitFor(() =>
      expect(screen.getByText(/cancelación de "cuerpo full/i)).toBeInTheDocument(),
    );
    expect(saldoPedido).toBeGreaterThan(pedidosAntes);
  });
});
