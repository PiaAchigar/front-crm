import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SaldosVencidosAviso } from "./SaldosVencidosAviso";

let respuesta: unknown = { clientes: [], total: 0 };
let vencidos: string[] = [];

const mariana = {
  customerId: "cu1",
  contactId: "co1",
  nombre: "Mariana Mansilla",
  vencido: 110667,
  vigente: 0,
  origenes: [
    {
      monto: 110667,
      acreditadoEl: "2026-05-01T10:00:00.000Z",
      venceEl: "2026-08-01T10:00:00.000Z",
      detalle: 'Cancelación de "Cuerpo Full — pack de 3"',
    },
  ],
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  respuesta = { clientes: [mariana], total: 110667 };
  vencidos = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      // Ojo con el orden: "/expired" contiene "/expire". Se distingue por el
      // método, que es lo que de verdad los separa.
      if (init?.method === "POST") {
        vencidos.push(u);
        return { ok: true, status: 200, json: async () => ({ monto: 110667, detalle: "ok" }) };
      }
      return { ok: true, status: 200, json: async () => respuesta };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("SaldosVencidosAviso", () => {
  it("si no hay saldos vencidos, no ocupa lugar", async () => {
    // Un aviso permanente que casi siempre dice "no hay nada" se vuelve
    // invisible justo el día que tiene algo para decir.
    respuesta = { clientes: [], total: 0 };
    const { container } = render(<SaldosVencidosAviso />, { wrapper });
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("dice a quién se le venció y cuánto", async () => {
    render(<SaldosVencidosAviso />, { wrapper });
    expect(await screen.findByText(/mariana mansilla/i)).toBeInTheDocument();
    // En el total del aviso, en el detalle del origen y en la columna de la
    // fila: el monto se repite a propósito en los tres lugares donde se mira.
    expect(screen.getAllByText(/\$110\.667/).length).toBeGreaterThanOrEqual(2);
  });

  it("muestra de dónde salió esa plata", async () => {
    // Sin el origen, "saldo vencido de Mariana" tres meses después no le dice
    // nada a nadie.
    render(<SaldosVencidosAviso />, { wrapper });
    expect(await screen.findByText(/cuerpo full — pack de 3/i)).toBeInTheDocument();
  });

  it("pregunta antes de pasarlo a caja", async () => {
    render(<SaldosVencidosAviso />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /pasar a caja/i }));
    expect(await screen.findByText(/caja del día/i)).toBeInTheDocument();
    expect(vencidos).toHaveLength(0);
  });

  it("recién lo pasa al confirmar", async () => {
    render(<SaldosVencidosAviso />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /pasar a caja/i }));
    await userEvent.click(await screen.findByRole("button", { name: /pasarlo a caja/i }));
    await waitFor(() => expect(vencidos).toHaveLength(1));
    expect(vencidos[0]).toContain("cu1");
  });

  it("con varias clientas, suma el total", async () => {
    respuesta = {
      clientes: [mariana, { ...mariana, customerId: "cu2", nombre: "Ana Pérez", vencido: 20000 }],
      total: 130667,
    };
    render(<SaldosVencidosAviso />, { wrapper });
    expect(await screen.findByText(/\$130\.667/)).toBeInTheDocument();
  });
});
