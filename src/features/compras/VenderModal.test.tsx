import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { VenderModal } from "./VenderModal";

const catalogo = {
  combos: [
    { origen: "combo", id: "c1", nombre: "Combo Facial Premium", packSesiones: null, precioDesde: 51000 },
  ],
  depilacion: [
    { origen: "depilacion", id: "d1", nombre: "Cuerpo Full", packSesiones: 3, precioDesde: 65000 },
  ],
  servicios: [
    { origen: "servicio", id: "s1", nombre: "Venus Legacy 1 zona", packSesiones: 3, precioDesde: 10000 },
  ],
  promociones: [
    { id: "p1", name: "Primavera", discountPercentage: 10, discountAmount: null },
  ],
};

let cuerposDePost: unknown[] = [];

function cotizacionDe(body: { sessions: number; promotionId?: string | null }) {
  const base = 65000 * body.sessions;
  const desc = body.sessions === 3 ? 166000 : base;
  return {
    description: body.sessions === 3 ? "Cuerpo Full — pack de 3" : "Cuerpo Full",
    sessionsTotal: body.sessions,
    baseAmount: base,
    discountedAmount: desc,
    finalAmount: body.promotionId ? Math.round(desc * 0.9) : desc,
    promotionId: body.promotionId ?? null,
    expiresAt: null,
    comboId: null,
    depilationComboId: "d1",
    serviceId: null,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  cuerposDePost = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/purchases/catalog")) {
        return { ok: true, status: 200, json: async () => catalogo };
      }
      if (u.includes("/purchases/quote")) {
        const body = JSON.parse(String(init?.body));
        return { ok: true, status: 200, json: async () => cotizacionDe(body) };
      }
      if (u.endsWith("/purchases")) {
        cuerposDePost.push(JSON.parse(String(init?.body)));
        return { ok: true, status: 201, json: async () => ({ id: "cp-nueva" }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

async function elegirCuerpoFull() {
  await userEvent.click(await screen.findByRole("button", { name: /cuerpo full/i }));
}

describe("VenderModal", () => {
  it("separa el catálogo en las tres cosas que se venden", async () => {
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    expect(await screen.findByRole("tab", { name: /packs de depilación/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /combos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /servicios/i })).toBeInTheDocument();
  });

  it("el buscador filtra por nombre", async () => {
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    await screen.findByRole("button", { name: /cuerpo full/i });
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), "nada de esto");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /cuerpo full/i })).not.toBeInTheDocument(),
    );
  });

  it("al elegir un pack propone sus sesiones", async () => {
    // 3 es lo que dice la política del combo. Ofrecer otro número sería
    // ofrecer un precio sin descuento sin que se entienda por qué.
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    expect(await screen.findByLabelText(/sesiones/i)).toHaveValue(3);
  });

  it("muestra las dos capas de descuento por separado", async () => {
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    expect(await screen.findByText("$195.000")).toBeInTheDocument(); // precio de lista
    // Dos veces: en la fila "Con el pack" y otra vez en el total.
    expect(screen.getAllByText("$166.000")).toHaveLength(2);
  });

  it("avisa cuándo el pack deja de descontar", async () => {
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    const sesiones = screen.getByLabelText(/sesiones/i);
    await userEvent.clear(sesiones);
    await userEvent.type(sesiones, "2");
    expect(await screen.findByText(/sin el descuento del pack/i)).toBeInTheDocument();
  });

  it("la promo se aplica sobre el precio del pack", async () => {
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.selectOptions(screen.getByLabelText(/promo/i), "p1");
    // "Con la promo" y el total.
    await waitFor(() => expect(screen.getAllByText("$149.400")).toHaveLength(2));
  });

  it("vende con los montos que se vieron en pantalla", async () => {
    // Lo que se congela es lo cotizado, no una cuenta que el navegador rehaga.
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));

    await waitFor(() => expect(cuerposDePost).toHaveLength(1));
    expect(cuerposDePost[0]).toMatchObject({
      customerId: "cu1",
      depilationComboId: "d1",
      sessionsTotal: 3,
      baseAmount: 195000,
      discountedAmount: 166000,
      finalAmount: 166000,
    });
  });

  it("no se puede vender sin elegir qué", async () => {
    render(<VenderModal customerId="cu1" onClose={() => {}} />, { wrapper });
    await screen.findByRole("button", { name: /cuerpo full/i });
    expect(screen.getByRole("button", { name: /^vender$/i })).toBeDisabled();
  });

  it("al vender se cierra", async () => {
    const onClose = vi.fn();
    render(<VenderModal customerId="cu1" onClose={onClose} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
