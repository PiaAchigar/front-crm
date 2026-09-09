import { render, screen, waitFor } from "@testing-library/react";
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
  perdidas: 0,
  usadas: 1,
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
let impacto = {
  pagos: 0,
  montoPagado: 0,
  facturas: 0,
  sesionesAgendadas: 0,
  sesionesConsumidas: 0,
  motivos: [] as string[],
  borrable: true,
};
let borrados: string[] = [];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  compras = [pack];
  borrados = [];
  impacto = {
    pagos: 0,
    montoPagado: 0,
    facturas: 0,
    sesionesAgendadas: 0,
    sesionesConsumidas: 0,
    motivos: [],
    borrable: true,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/purchases/catalog")) {
        return { ok: true, status: 200, json: async () => ({ combos: [], depilacion: [], servicios: [], promociones: [] }) };
      }
      if (u.includes("/delete-impact")) {
        return { ok: true, status: 200, json: async () => impacto };
      }
      if (init?.method === "DELETE") {
        borrados.push(u);
        return { ok: true, status: 204, json: async () => ({}) };
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

  it("una venta sin nada colgando se elimina de verdad", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /^eliminar$/i }));
    await userEvent.click(await screen.findByRole("button", { name: /eliminar para siempre/i }));
    await waitFor(() => expect(borrados).toHaveLength(1));
  });

  it("el cartel avisa que no queda rastro", async () => {
    // Es la diferencia con cancelar, y hay que decirla antes de apretar.
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /^eliminar$/i }));
    expect(await screen.findByText(/no va a quedar registro/i)).toBeInTheDocument();
  });

  it("si tiene un pago, explica por qué no se puede y ofrece cancelar", async () => {
    impacto = { ...impacto, pagos: 1, montoPagado: 66000, motivos: ["ya tiene 1 pago cobrado por $66.000"], borrable: false };
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /^eliminar$/i }));

    expect(await screen.findByText(/ya tiene 1 pago cobrado por \$66\.000/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar la compra/i })).toBeInTheDocument();
    // Y no ofrece borrarla igual: sería ofrecer algo que el backend rechaza.
    expect(screen.queryByRole("button", { name: /eliminar para siempre/i })).not.toBeInTheDocument();
  });

  it("no borra nada si está bloqueada", async () => {
    impacto = { ...impacto, facturas: 1, motivos: ["está facturada (1 factura la incluye)"], borrable: false };
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /^eliminar$/i }));
    await screen.findByText(/está facturada/i);
    expect(borrados).toHaveLength(0);
  });

  it("una compra cancelada igual se puede eliminar si no cuelga nada", async () => {
    // Cancelar por error y querer limpiarlo es el mismo caso: no pasó nada.
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByRole("button", { name: /^eliminar$/i })).toBeInTheDocument();
  });

  it("una sesión perdida se ve, y en rojo", async () => {
    // La clienta no vino: perdió esa sesión y su plata. Es lo primero que va a
    // preguntar, así que no puede estar escondido.
    compras = [
      {
        ...pack,
        consumidas: 0,
        perdidas: 1,
        usadas: 1,
        agendadas: 0,
        disponibles: 2,
        sessions: [
          { id: "s1", sessionNumber: 1, appointmentId: "a1", appointmentStart: "2026-09-01T13:00:00.000Z", consumedAt: null, estado: "perdida" },
        ],
      },
    ];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/1 perdida por no venir/i)).toBeInTheDocument();
    expect(screen.getByText("1 de 3 usadas")).toBeInTheDocument();
  });

  it("el botón de vender abre la pantalla de venta", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /vender/i }));
    expect(await screen.findByRole("heading", { name: /vender a la clienta/i })).toBeInTheDocument();
  });
});
