import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SaldoCard } from "./SaldoCard";

let respuesta: unknown;
let posts: { url: string; body: unknown }[] = [];

const vencido = {
  id: "mv1",
  monto: 80000,
  original: 100000,
  acreditadoEl: "2026-04-09T18:03:10.000Z",
  venceEl: "2026-07-09T18:03:10.000Z",
  vencido: true,
  detalle: 'Cancelación de "Alpha Synergy — pack de 4"',
  aplazos: [] as string[],
};

const vigente = {
  id: "mv2",
  monto: 50000,
  original: 50000,
  acreditadoEl: "2026-08-01T10:00:00.000Z",
  venceEl: "2026-11-01T10:00:00.000Z",
  vencido: false,
  detalle: 'Cancelación de "Cuerpo Full"',
  aplazos: [] as string[],
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  respuesta = { vigente: 50000, vencido: 80000, total: 130000, lotes: [vencido, vigente] };
  posts = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
        return { ok: true, status: 200, json: async () => ({ aplazados: 1 }) };
      }
      return { ok: true, status: 200, json: async () => respuesta };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("SaldoCard", () => {
  it("separa lo disponible de lo vencido", async () => {
    // El número plano de `credit_balance` sumaba los dos y no servía para
    // responderle nada a la clienta.
    render(<SaldoCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/disponible/i)).toBeInTheDocument();
    // "vencido" está en el resumen y en la pastillita de la fila.
    expect(screen.getAllByText(/vencido/i).length).toBeGreaterThanOrEqual(2);
    // Cada monto aparece dos veces a propósito: en el resumen de arriba y en
    // su propia fila.
    expect(screen.getAllByText("$50.000")).toHaveLength(2);
    expect(screen.getAllByText(/\$80\.000/).length).toBeGreaterThanOrEqual(2);
  });

  it("muestra cuándo vence cada acreditación", async () => {
    render(<SaldoCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/venció el 09\/07\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/vence el 01\/11\/2026/i)).toBeInTheDocument();
  });

  it("explica por qué quedan 80.000 de 100.000", async () => {
    render(<SaldoCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/ya usó \$20\.000/i)).toBeInTheDocument();
  });

  it("sin saldo, lo dice y no ofrece nada", async () => {
    respuesta = { vigente: 0, vencido: 0, total: 0, lotes: [] };
    render(<SaldoCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/sin saldo a favor/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aplazar/i })).not.toBeInTheDocument();
  });

  it("no ofrece pasar a caja si no hay nada vencido", async () => {
    respuesta = { vigente: 50000, vencido: 0, total: 50000, lotes: [vigente] };
    render(<SaldoCard customerId="cu1" />, { wrapper });
    await screen.findByText(/disponible/i);
    expect(screen.queryByRole("button", { name: /pasar .* a caja/i })).not.toBeInTheDocument();
  });

  it("deja aplazar también un saldo que todavía no venció", async () => {
    // Estirar antes de que venza es el mismo movimiento; esperar a que venza
    // para poder estirarlo sería una regla sin motivo.
    respuesta = { vigente: 50000, vencido: 0, total: 50000, lotes: [vigente] };
    render(<SaldoCard customerId="cu1" />, { wrapper });
    expect(await screen.findByRole("button", { name: /^aplazar$/i })).toBeInTheDocument();
  });

  it("con una sola acreditación vencida no ofrece 'aplazar todo'", async () => {
    render(<SaldoCard customerId="cu1" />, { wrapper });
    await screen.findByText(/disponible/i);
    expect(screen.queryByRole("button", { name: /aplazar todo/i })).not.toBeInTheDocument();
  });

  it("con dos vencidas sí, para no tener que repetir la fecha", async () => {
    const otro = { ...vencido, id: "mv3", monto: 15000, original: 15000 };
    respuesta = { vigente: 0, vencido: 95000, total: 95000, lotes: [vencido, otro] };
    render(<SaldoCard customerId="cu1" />, { wrapper });
    expect(await screen.findByRole("button", { name: /aplazar todo/i })).toBeInTheDocument();
  });

  it("aplazar manda la fecha elegida y el motivo", async () => {
    render(<SaldoCard customerId="cu1" />, { wrapper });
    await userEvent.click((await screen.findAllByRole("button", { name: /^aplazar$/i }))[0]!);

    // Los botones "Aplazar" de las filas siguen en el DOM detrás del diálogo,
    // así que la búsqueda se acota a él.
    const dialogo = within(screen.getByRole("dialog"));
    const fecha = dialogo.getByLabelText(/nueva fecha/i);
    await userEvent.clear(fecha);
    await userEvent.type(fecha, "2026-12-12");
    await userEvent.type(dialogo.getByLabelText(/motivo/i), "estuvo internada");
    await userEvent.click(dialogo.getByRole("button", { name: /^aplazar$/i }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.url).toContain("/postpone");
    expect(posts[0]!.body).toMatchObject({
      movimientoIds: ["mv1"],
      nuevaFecha: "2026-12-12",
      motivo: "estuvo internada",
    });
  });

  it("el motivo en blanco no se manda", async () => {
    render(<SaldoCard customerId="cu1" />, { wrapper });
    await userEvent.click((await screen.findAllByRole("button", { name: /^aplazar$/i }))[0]!);
    const dialogo = within(screen.getByRole("dialog"));
    await userEvent.click(dialogo.getByRole("button", { name: /^aplazar$/i }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect((posts[0]!.body as { motivo?: string }).motivo).toBeUndefined();
  });

  it("muestra el historial de aplazos de cada saldo", async () => {
    // Es lo único que responde "¿por qué esta plata vence en diciembre?".
    respuesta = {
      vigente: 80000,
      vencido: 0,
      total: 80000,
      lotes: [{ ...vencido, vencido: false, aplazos: ["Aplazado del 09/07/2026 al 12/12/2026: internada"] }],
    };
    render(<SaldoCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/aplazado del 09\/07\/2026 al 12\/12\/2026/i)).toBeInTheDocument();
  });

  it("pasar a caja pregunta antes", async () => {
    render(<SaldoCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /pasar .* a caja/i }));
    expect(await screen.findByText(/caja del día/i)).toBeInTheDocument();
    expect(posts).toHaveLength(0);
  });
});
