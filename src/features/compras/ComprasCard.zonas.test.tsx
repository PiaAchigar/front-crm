import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ComprasCard } from "./ComprasCard";
import type { Compra, ServicioComprado } from "../../api/compras";

vi.mock("../../lib/embed", () => ({
  isEmbedded: true,
  DASHBOARD_ORIGIN: "https://dashboard.test",
  pedirAgendar: vi.fn(),
  useEmbedToken: () => ({ ready: true, token: "t" }),
}));

const linea = (o: Partial<ServicioComprado>): ServicioComprado => ({
  id: "l", serviceId: null, depilationComboId: "dc1", serviceName: "Cuerpo Full",
  repeticion: 1, orden: 1, appointmentId: null, appointmentStart: null,
  consumedAt: null, estado: "disponible", zonasDelTurno: null, ...o,
});

const depilacion: Compra = {
  id: "cp-depi", customerId: "cu1", comboId: null, serviceId: null, depilationComboId: "dc1",
  description: "Cuerpo Full — pack de 6", sessionsTotal: 6,
  baseAmount: 100000, discountedAmount: 100000, finalAmount: 100000,
  promotionId: null, promotionName: null, purchasedAt: "2026-09-08T15:00:00.000Z",
  expiresAt: null, cancelledAt: null, notes: null, devuelta: false, devuelto: 0,
  consumidas: 0, perdidas: 0, usadas: 0, agendadas: 1, disponibles: 1, vencidas: 0,
  pagado: 100000, saldo: 0, saldada: true,
  zonasDelPack: [
    { nombre: "Pierna entera", cantidad: 1 },
    { nombre: "Axilas", cantidad: 1 },
    { nombre: "Zona a elección", cantidad: 1 },
  ],
  servicios: [
    linea({ id: "l1", repeticion: 1, estado: "agendada", appointmentId: "a1",
      appointmentStart: "2026-10-20T13:00:00.000Z", zonasDelTurno: ["Axilas", "Pierna entera"] }),
    linea({ id: "l2", repeticion: 2 }),
  ],
} as Compra;

const combo: Compra = {
  ...depilacion, id: "cp-combo", description: "Combo común", depilationComboId: null,
  sessionsTotal: 2, zonasDelPack: undefined,
  servicios: [
    linea({ id: "c1", serviceId: "s1", depilationComboId: null, serviceName: "Baby Botox" }),
    linea({ id: "c2", serviceId: "s2", depilationComboId: null, serviceName: "Limpieza" }),
  ],
} as Compra;

let compras: Compra[] = [];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
    const u = String(url);
    if (u.includes("/purchases/catalog")) {
      return { ok: true, status: 200, json: async () => ({ combos: [], depilacion: [], servicios: [], promociones: [] }) };
    }
    if (u.includes("/purchases")) return { ok: true, status: 200, json: async () => compras };
    return { ok: true, status: 200, json: async () => ({}) };
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("ComprasCard — sesiones y zonas", () => {
  it("depilación: zonas del pack, sesión N de M y zonas de cada turno", async () => {
    compras = [depilacion];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /ver servicios/i }));
    expect(await screen.findByText("Zonas del pack: Pierna entera, Axilas, 1 a elección")).toBeInTheDocument();
    expect(screen.getByText("Sesión 1 de 6")).toBeInTheDocument();
    expect(screen.getByText("Sesión 2 de 6")).toBeInTheDocument();
    const fila = screen.getByText("Sesión 1 de 6").closest("tr")!;
    expect(fila).toHaveTextContent("Axilas, Pierna entera");
  });

  it("un combo común no muestra zonas ni sesiones", async () => {
    compras = [combo];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /ver servicios/i }));
    expect(await screen.findByText("Baby Botox")).toBeInTheDocument();
    expect(screen.queryByText(/Zonas del pack/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sesión/)).not.toBeInTheDocument();
  });
});
