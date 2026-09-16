import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ComprasCard } from "./ComprasCard";
import type { Compra } from "../../api/compras";

/**
 * Embebido, que es como corre de verdad: dentro del iframe del dashboard.
 * Suelto no hay a quién pedirle que abra la agenda, y ahí la pastilla no es
 * un botón — eso lo cubre su propio test.
 */
const pedirAgendar = vi.fn();
const embed = { isEmbedded: true };
vi.mock("../../lib/embed", () => ({
  // Getter y no valor fijo: así un test puede correr "suelto" sin otro archivo.
  get isEmbedded() {
    return embed.isEmbedded;
  },
  DASHBOARD_ORIGIN: "https://dashboard.test",
  pedirAgendar: (...args: unknown[]) => pedirAgendar(...args),
  useEmbedToken: () => ({ ready: true, token: "t" }),
}));

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
  devuelta: false,
  devuelto: 0,
  consumidas: 1,
  perdidas: 0,
  usadas: 1,
  agendadas: 1,
  disponibles: 1,
  vencidas: 0,
  pagado: 100000,
  saldo: 66000,
  saldada: false,
  servicios: [
    { id: "s1", serviceId: "svc-full", serviceName: "Cuerpo Full", repeticion: 1, orden: 1, appointmentId: "a1", appointmentStart: "2026-09-01T13:00:00.000Z", consumedAt: "2026-09-01T14:00:00.000Z", estado: "consumida" },
    { id: "s2", serviceId: "svc-full", serviceName: "Cuerpo Full", repeticion: 2, orden: 1, appointmentId: "a2", appointmentStart: "2026-10-01T13:00:00.000Z", consumedAt: null, estado: "agendada" },
    { id: "s3", serviceId: "svc-full", serviceName: "Cuerpo Full", repeticion: 3, orden: 1, appointmentId: null, appointmentStart: null, consumedAt: null, estado: "disponible" },
  ],
};

const comboPurchase: Compra = {
  ...pack,
  id: "cp-combo",
  description: "Combo1 - Prueba",
  sessionsTotal: 1,
  consumidas: 1,
  perdidas: 0,
  usadas: 1,
  agendadas: 0,
  disponibles: 1,
  vencidas: 0,
  servicios: [
    {
      id: "sv1",
      serviceId: "s1",
      serviceName: "Baby Botox",
      repeticion: 1,
      orden: 1,
      appointmentId: "ap1",
      appointmentStart: "2026-09-12T13:00:00.000Z",
      consumedAt: "2026-09-12T14:00:00.000Z",
      estado: "consumida",
    },
    {
      id: "sv2",
      serviceId: "s2",
      serviceName: "Depilación facial con hilo",
      repeticion: 1,
      orden: 1,
      appointmentId: null,
      appointmentStart: null,
      consumedAt: null,
      estado: "disponible",
    },
  ],
};

let compras: Compra[] = [];
let impacto = {
  pagos: 0,
  montoPagado: 0,
  facturas: 0,
  sesionesAgendadas: 0,
  sesionesConsumidas: 0,
  movimientosDeSaldo: 0,
  motivos: [] as string[],
  borrable: true,
};
let borrados: string[] = [];
let devoluciones: string[] = [];
let cobros: { amount: number; method: string; wantsInvoice: boolean }[] = [];
let chequeo = {
  cancelada: true,
  pagado: 166000,
  finalAmount: 166000,
  usadas: 1,
  saldoDisponible: 110667,
  yaDevuelta: false,
  motivos: [] as string[],
  sePuede: true,
  monto: 110667,
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  compras = [pack];
  borrados = [];
  devoluciones = [];
  cobros = [];
  chequeo = {
    cancelada: true,
    pagado: 166000,
    finalAmount: 166000,
    usadas: 1,
    saldoDisponible: 110667,
    yaDevuelta: false,
    motivos: [],
    sePuede: true,
    monto: 110667,
  };
  impacto = {
    pagos: 0,
    montoPagado: 0,
    facturas: 0,
    sesionesAgendadas: 0,
    sesionesConsumidas: 0,
    movimientosDeSaldo: 0,
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
      if (u.includes("/checkout-state")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ pendiente: 66000, minimo: 0, sugerido: 66000, faltaElMinimo: false }),
        };
      }
      if (u.endsWith("/checkout")) {
        cobros.push(JSON.parse(String(init?.body ?? "{}")));
        return {
          ok: true,
          status: 201,
          json: async () => ({ pendiente: 0, minimo: 0, sugerido: 0, faltaElMinimo: false }),
        };
      }
      if (u.includes("/delete-impact")) {
        return { ok: true, status: 200, json: async () => impacto };
      }
      if (u.includes("/refund-check")) {
        return { ok: true, status: 200, json: async () => chequeo };
      }
      if (u.endsWith("/refund")) {
        devoluciones.push(u);
        return { ok: true, status: 200, json: async () => ({ monto: chequeo.monto }) };
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

  it("cuenta los servicios usados, sin contar los agendados", async () => {
    // Un turno se puede cancelar y el servicio vuelve: si contara, la barra
    // retrocedería.
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText("1 de 3 servicios usados")).toBeInTheDocument();
  });

  it("muestra el ahorro contra el precio de lista", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/ahorra \$29\.000/i)).toBeInTheDocument();
  });

  it("el detalle de los servicios aparece al desplegar", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /ver servicios/i }));
    expect(await screen.findByText("Hecho")).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
    expect(screen.getByText("A agendar")).toBeInTheDocument();
  });

  it("un combo de 2 servicios muestra los dos nombres con su estado", async () => {
    compras = [comboPurchase];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /ver servicios/i }));
    expect(await screen.findByText("Baby Botox")).toBeInTheDocument();
    expect(screen.getByText("Depilación facial con hilo")).toBeInTheDocument();
    expect(screen.getByText("Hecho")).toBeInTheDocument();
    expect(screen.getByText("A agendar")).toBeInTheDocument();
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

  it("una compra cancelada ya no se puede eliminar", async () => {
    // Eliminar es sólo para una venta cargada por error. Una vez cancelada ya
    // es historia, y casi siempre movió el saldo a favor.
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await screen.findByText("Cancelada");
    expect(screen.queryByRole("button", { name: /^eliminar$/i })).not.toBeInTheDocument();
  });

  it("una compra ya devuelta lo muestra y no ofrece devolver de nuevo", async () => {
    compras = [
      { ...pack, cancelledAt: "2026-09-09T10:00:00.000Z", devuelta: true, devuelto: 110667 },
    ];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/devolución realizada/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /devolver plata/i })).not.toBeInTheDocument();
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
        servicios: [
          { id: "s1", serviceId: "svc-full", serviceName: "Cuerpo Full", repeticion: 1, orden: 1, appointmentId: "a1", appointmentStart: "2026-09-01T13:00:00.000Z", consumedAt: null, estado: "perdida" },
          { id: "s2", serviceId: "svc-full", serviceName: "Cuerpo Full", repeticion: 2, orden: 1, appointmentId: null, appointmentStart: null, consumedAt: null, estado: "disponible" },
          { id: "s3", serviceId: "svc-full", serviceName: "Cuerpo Full", repeticion: 3, orden: 1, appointmentId: null, appointmentStart: null, consumedAt: null, estado: "disponible" },
        ],
      },
    ];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByText(/1 perdida por no venir/i)).toBeInTheDocument();
    expect(screen.getByText("1 de 3 servicios usados")).toBeInTheDocument();
  });

  it("una compra activa no ofrece devolver la plata", async () => {
    // Primero hay que cancelarla: devolver algo que la clienta todavía tiene
    // sería dejarle el pack gratis.
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await screen.findByText("Cuerpo Full — pack de 3");
    expect(screen.queryByRole("button", { name: /devolver plata/i })).not.toBeInTheDocument();
  });

  it("una compra cancelada sí lo ofrece", async () => {
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByRole("button", { name: /devolver plata/i })).toBeInTheDocument();
  });

  it("el cartel dice cuánto sale de la caja", async () => {
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /devolver plata/i }));
    // En el título y en el botón de confirmar: el monto tiene que estar en el
    // lugar donde se decide, no sólo en el encabezado.
    expect(await screen.findAllByText(/\$110\.667/)).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: /devolver \$110\.667/i })).toBeInTheDocument();
    expect(screen.getByText(/caja del día/i)).toBeInTheDocument();
  });

  it("devuelve al confirmar", async () => {
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /devolver plata/i }));
    await userEvent.click(await screen.findByRole("button", { name: /devolver .*110\.667/i }));
    await waitFor(() => expect(devoluciones).toHaveLength(1));
  });

  it("si era una seña, explica que no se devuelve en efectivo", async () => {
    chequeo = {
      ...chequeo,
      pagado: 66400,
      sePuede: false,
      monto: 0,
      motivos: ["no está paga al 100% (se pagaron $66.400 de $166.000) — esa plata queda a favor, pero no se devuelve en efectivo"],
    };
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /devolver plata/i }));
    expect(await screen.findByText(/no se devuelve en efectivo/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^devolver \$/i })).not.toBeInTheDocument();
  });

  it("no devuelve nada si está bloqueada", async () => {
    chequeo = { ...chequeo, sePuede: false, monto: 0, motivos: ["ya se le devolvió la plata de esta compra"] };
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /devolver plata/i }));
    await screen.findByText(/ya se le devolvió/i);
    expect(devoluciones).toHaveLength(0);
  });

  it("el botón de vender abre la pantalla de venta", async () => {
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: /vender/i }));
    expect(await screen.findByRole("heading", { name: /vender a la clienta/i })).toBeInTheDocument();
  });
});

describe("ComprasCard — ir a agendar", () => {
  it('la pastilla "A agendar" pide abrir la agenda con la clienta y el servicio', async () => {
    const user = userEvent.setup();
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await user.click(await screen.findByRole("button", { name: /ver servicios/i }));

    await user.click(screen.getByRole("button", { name: /a agendar/i }));

    expect(pedirAgendar).toHaveBeenCalledWith({ customerId: "cu1", serviceId: "svc-full" });
  });

  it("suelto, sin el dashboard alrededor, la pastilla no es un botón", async () => {
    embed.isEmbedded = false;
    try {
      const user = userEvent.setup();
      render(<ComprasCard customerId="cu1" />, { wrapper });
      await user.click(await screen.findByRole("button", { name: /ver servicios/i }));

      expect(screen.queryByRole("button", { name: /a agendar/i })).not.toBeInTheDocument();
      // Pero la etiqueta sigue estando: lo que se cae es el salto, no el dato.
      expect(screen.getByText("A agendar")).toBeInTheDocument();
    } finally {
      embed.isEmbedded = true;
    }
  });

  it("los servicios que ya pasaron no son botones: no hay nada que agendar", async () => {
    const user = userEvent.setup();
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await user.click(await screen.findByRole("button", { name: /ver servicios/i }));

    expect(screen.queryByRole("button", { name: /^hecho$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^agendado$/i })).not.toBeInTheDocument();
  });
});

describe("ComprasCard — cobrar lo que falta", () => {
  it("una compra que debe plata ofrece cobrarla", async () => {
    // Antes esto no existía: si Laura tomaba una seña al vender, la plata que
    // faltaba no tenía por dónde entrar (Pia, 2026-09-16).
    render(<ComprasCard customerId="cu1" />, { wrapper });
    expect(await screen.findByRole("button", { name: /^cobrar$/i })).toBeInTheDocument();
  });

  it("una compra paga no lo ofrece", async () => {
    compras = [{ ...pack, pagado: 166000, saldo: 0, saldada: true }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await screen.findByText("Cuerpo Full — pack de 3");
    expect(screen.queryByRole("button", { name: /^cobrar$/i })).not.toBeInTheDocument();
  });

  it("una cancelada tampoco: el backend la rechaza igual", async () => {
    compras = [{ ...pack, cancelledAt: "2026-09-09T10:00:00.000Z" }];
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await screen.findByText("Cuerpo Full — pack de 3");
    expect(screen.queryByRole("button", { name: /^cobrar$/i })).not.toBeInTheDocument();
  });

  it("cobra el monto y el medio que se eligieron", async () => {
    const user = userEvent.setup();
    render(<ComprasCard customerId="cu1" />, { wrapper });
    await user.click(await screen.findByRole("button", { name: /^cobrar$/i }));

    // Propone lo que falta, que es lo más común en el mostrador.
    await screen.findByRole("heading", { name: /^cobrar$/i });
    await user.click(screen.getByRole("button", { name: /cobrar \$66\.000/i }));

    await waitFor(() => expect(cobros).toHaveLength(1));
    expect(cobros[0]).toMatchObject({ amount: 66000, method: "cash", wantsInvoice: false });
  });
});
