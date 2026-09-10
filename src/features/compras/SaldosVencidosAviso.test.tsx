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
      original: 110667,
      acreditadoEl: "2026-05-01T10:00:00.000Z",
      venceEl: "2026-08-01T10:00:00.000Z",
      detalle: 'Cancelación de "Cuerpo Full — pack de 3"',
    },
  ],
};

/** Sofía gastó parte del lote: acreditados 100.000, le quedan 80.000. */
const sofia = {
  customerId: "cu9",
  contactId: "co9",
  nombre: "Sofía Herrera",
  vencido: 80000,
  vigente: 0,
  origenes: [
    {
      monto: 80000,
      original: 100000,
      acreditadoEl: "2026-04-09T18:03:10.000Z",
      venceEl: "2026-07-09T18:03:10.000Z",
      detalle: 'Cancelación de "Alpha Synergy — pack de 4"',
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

  /**
   * La redacción vieja ponía una sola fecha suelta al lado del origen y se leía
   * como la fecha de la cancelación. Pasó de verdad (2026-09-10).
   */
  it("distingue la fecha en que se acreditó de la de vencimiento", async () => {
    respuesta = { clientes: [sofia], total: 80000 };
    render(<SaldosVencidosAviso />, { wrapper });
    expect(await screen.findByText(/acreditado el 09\/04\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/venció el 09\/07\/2026/i)).toBeInTheDocument();
  });

  it("explica por qué quedan 80.000 de 100.000", async () => {
    // Sin esto el número no se puede reconstruir mirando la pantalla.
    respuesta = { clientes: [sofia], total: 80000 };
    render(<SaldosVencidosAviso />, { wrapper });
    expect(await screen.findByText(/ya usó \$20\.000/i)).toBeInTheDocument();
  });

  it("no habla de plata usada cuando el lote está entero", async () => {
    render(<SaldosVencidosAviso />, { wrapper });
    await screen.findByText(/mariana mansilla/i);
    expect(screen.queryByText(/ya usó/i)).not.toBeInTheDocument();
  });

  /**
   * "Ignorar" es un descarte de UI: no llama a la API, no toca la plata y no
   * deja rastro. Lo único que hace es dejar de mostrarse.
   */
  describe("ignorar el aviso", () => {
    it("saca a esa clienta sin llamar a la API", async () => {
      render(<SaldosVencidosAviso />, { wrapper });
      await userEvent.click(await screen.findByRole("button", { name: /^ignorar$/i }));
      await waitFor(() => expect(screen.queryByText(/mariana mansilla/i)).not.toBeInTheDocument());
      expect(vencidos).toHaveLength(0);
    });

    it("ignorar una no esconde a las demás", async () => {
      respuesta = {
        clientes: [mariana, { ...mariana, customerId: "cu2", nombre: "Ana Pérez", vencido: 20000 }],
        total: 130667,
      };
      render(<SaldosVencidosAviso />, { wrapper });
      await screen.findByText(/ana pérez/i);
      await userEvent.click(screen.getAllByRole("button", { name: /^ignorar$/i })[0]!);
      await waitFor(() => expect(screen.queryByText(/mariana mansilla/i)).not.toBeInTheDocument());
      expect(screen.getByText(/ana pérez/i)).toBeInTheDocument();
    });

    it("al ignorar una, el total deja de contarla", async () => {
      // Si el encabezado siguiera diciendo $130.667 con una sola fila abajo,
      // el número no cerraría con lo que se ve.
      respuesta = {
        clientes: [mariana, { ...mariana, customerId: "cu2", nombre: "Ana Pérez", vencido: 20000 }],
        total: 130667,
      };
      render(<SaldosVencidosAviso />, { wrapper });
      await screen.findByText(/\$130\.667/);
      await userEvent.click(screen.getAllByRole("button", { name: /^ignorar$/i })[0]!);
      await waitFor(() => expect(screen.queryByText(/\$130\.667/)).not.toBeInTheDocument());
      expect(screen.getAllByText(/\$20\.000/).length).toBeGreaterThanOrEqual(1);
    });

    it("la × cierra el aviso entero", async () => {
      render(<SaldosVencidosAviso />, { wrapper });
      await screen.findByText(/mariana mansilla/i);
      await userEvent.click(screen.getByRole("button", { name: /cerrar el aviso/i }));
      await waitFor(() =>
        expect(screen.queryByText(/saldo a favor vencido/i)).not.toBeInTheDocument(),
      );
    });

    it("el descarte se olvida al volver a montar la pantalla", async () => {
      // Es la característica, no una limitación: un saldo vencido que nadie
      // resolvió tiene que seguir molestando.
      const { unmount } = render(<SaldosVencidosAviso />, { wrapper });
      await userEvent.click(await screen.findByRole("button", { name: /^ignorar$/i }));
      await waitFor(() => expect(screen.queryByText(/mariana mansilla/i)).not.toBeInTheDocument());
      unmount();

      render(<SaldosVencidosAviso />, { wrapper });
      expect(await screen.findByText(/mariana mansilla/i)).toBeInTheDocument();
    });

    it("avisa que no cambia nada", async () => {
      render(<SaldosVencidosAviso />, { wrapper });
      const boton = await screen.findByRole("button", { name: /^ignorar$/i });
      expect(boton).toHaveAttribute("title", expect.stringMatching(/la plata sigue vencida/i));
    });
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
