import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ComprasCard } from "./ComprasCard";
import type { Compra } from "../../api/compras";

const pack: Compra = {
  id: "cp1",
  customerId: "cu1",
  comboId: null,
  serviceId: null,
  depilationComboId: "d1",
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
  consumidas: 1,
  agendadas: 1,
  disponibles: 1,
  vencidas: 0,
  pagado: 100000,
  saldo: 66000,
  saldada: false,
  sessions: [
    { id: "s1", sessionNumber: 1, appointmentId: "a1", appointmentStart: "2026-09-01T13:00:00.000Z", consumedAt: "2026-09-01T14:00:00.000Z", estado: "consumida" },
    { id: "s2", sessionNumber: 2, appointmentId: "a2", appointmentStart: "2026-10-01T13:00:00.000Z", consumedAt: null, estado: "agendada" },
    { id: "s3", sessionNumber: 3, appointmentId: null, appointmentStart: null, consumedAt: null, estado: "disponible" },
  ],
};

let compras: Compra[] = [];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  compras = [pack];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/purchases/catalog")) {
        return { ok: true, status: 200, json: async () => ({ combos: [], depilacion: [], servicios: [], promociones: [] }) };
      }
      if (u.includes("/purchases")) return { ok: true, status: 200, json: async () => compras };
      return { ok: true, status: 200, json: async () => ({}) };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("ComprasCard", () => {
  it("muestra qué compró y por cuánto", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText("Cuerpo Full — pack de 3")).toBeInTheDocument();
    expect(screen.getByText("$166.000")).toBeInTheDocument();
  });

  it("avisa lo que falta cobrar", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText("Debe $66.000")).toBeInTheDocument();
  });

  it("cuenta las sesiones usadas, sin contar las agendadas", async () => {
    // Un turno se puede cancelar y la sesión vuelve: si contara, la barra
    // retrocedería.
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText("1 de 3 usadas")).toBeInTheDocument();
  });

  it("muestra el ahorro contra el precio de lista", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/ahorra \$29\.000/i)).toBeInTheDocument();
  });

  it("el detalle de las sesiones aparece al desplegar", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /ver sesiones/i }));
    expect(await screen.findByText("Consumida")).toBeInTheDocument();
    expect(screen.getByText("Agendada")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("sin compras, lo dice y no muestra una tabla vacía", async () => {
    compras = [];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/todavía no compró nada/i)).toBeInTheDocument();
  });

  it("una compra cancelada se ve cancelada y no ofrece cancelarla de nuevo", async () => {
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText("Cancelada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^cancelar compra$/i })).not.toBeInTheDocument();
  });

  it("el botón de vender abre la pantalla de venta", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /vender/i }));
    expect(await screen.findByRole("heading", { name: /vender a la clienta/i })).toBeInTheDocument();
  });
});
