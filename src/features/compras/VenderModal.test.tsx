import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { VenderModal } from "./VenderModal";

const PROMOS_BASE = [
  {
    id: "p1",
    name: "Primavera",
    promotionType: "percentage",
    precioDelPaquete: null,
    discountPercentage: 10,
    discountAmount: null,
    // Aplica al Combo Facial Premium (c1) y a Cuerpo Full (d1): son los dos
    // ítems que el resto de los tests de este archivo usan para probar la
    // promo. NO aplica a Combo Express (cx1): ese es el que prueba el filtro.
    destinos: [
      { tipo: "combo", id: "c1", cantidad: 1 },
      { tipo: "depilacion", id: "d1", cantidad: 1 },
    ],
  },
  {
    id: "pk1",
    name: "Promo Novia",
    promotionType: "paquete",
    precioDelPaquete: 250000,
    discountPercentage: null,
    discountAmount: null,
    // Lleva la Limpieza de cutis (s-limpieza), por 3.
    destinos: [{ tipo: "servicio", id: "s-limpieza", cantidad: 3 }],
  },
  {
    id: "pd1",
    name: "Promo Baby Botox",
    promotionType: "percentage",
    precioDelPaquete: null,
    discountPercentage: 15,
    discountAmount: null,
    // Destino con un nombre bien distinto del de la promo: si coincidieran
    // ("Baby Botox" adentro de "Promo Baby Botox") el buscador de texto del
    // test encontraría dos elementos y no podría elegir cuál mirar.
    destinos: [{ tipo: "servicio", id: "s1", cantidad: 1 }],
  },
];

const COMBOS_BASE = [
  { origen: "combo", id: "c1", nombre: "Combo Facial Premium", packSesiones: null, packDescuentoPct: null, precioDesde: 51000 },
  { origen: "combo", id: "cx1", nombre: "Combo Express", packSesiones: null, packDescuentoPct: null, precioDesde: 35000 },
];

const catalogo: any = {
  combos: [...COMBOS_BASE],
  depilacion: [
    { origen: "depilacion", id: "d1", nombre: "Cuerpo Full", packSesiones: 3, packDescuentoPct: 15, precioDesde: 65000 },
  ],
  capacitaciones: [
    { origen: "capacitacion", id: "t1", nombre: "Formación en Depilación Láser", packSesiones: 1, packDescuentoPct: 0, precioDesde: 250000 },
  ],
  servicios: [
    { origen: "servicio", id: "s1", nombre: "Venus Legacy 1 zona", packSesiones: 3, packDescuentoPct: 15, precioDesde: 10000 },
    { origen: "servicio", id: "s-limpieza", nombre: "Limpieza de cutis", packSesiones: null, packDescuentoPct: null, precioDesde: 45000 },
  ],
  promociones: [...PROMOS_BASE],
};

let cuerposDePost: any[] = [];
let cobros: any[] = [];
// Cada body que le llegó a /purchases/quote, en orden. Sirve para probar QUÉ
// se le pidió cotizar al backend sin depender de leer la pantalla — la
// solapa Promos necesita esto para verificar el `origen` real, no sólo lo que
// se ve (spec de la Task 11 y hallazgos del revisor sobre exclusión mutua).
let cotizacionesPedidas: any[] = [];

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
  cobros = [];
  cotizacionesPedidas = [];
  catalogo.promociones = [...PROMOS_BASE];
  catalogo.combos = [...COMBOS_BASE];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/purchases/catalog")) {
        // Una copia y no el objeto: una respuesta HTTP de verdad es siempre
        // nueva, y devolver el mismo objeto hacía que tocar `catalogo` en el
        // test tocara también lo que React Query tenía guardado — con lo cual
        // un test de caché no podía distinguir nada.
        return { ok: true, status: 200, json: async () => structuredClone(catalogo) };
      }
      if (u.includes("/purchases/quote")) {
        const body = JSON.parse(String(init?.body));
        cotizacionesPedidas.push(body);
        return { ok: true, status: 200, json: async () => cotizacionDe(body) };
      }
      if (u.includes("/checkout")) {
        cobros.push(JSON.parse(String(init?.body)));
        return { ok: true, status: 201, json: async () => ({ pendiente: 0, minimo: 0, sugerido: 0, faltaElMinimo: false }) };
      }
      if (u.endsWith("/purchases")) {
        const body = JSON.parse(String(init?.body));
        cuerposDePost.push(body);
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: "cp-nueva", pagadoConSaldo: body.usarSaldo ?? 0 }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

async function elegirCuerpoFull() {
  await userEvent.click(await screen.findByRole("button", { name: /cuerpo full/i }));
}

describe("VenderModal — saldo a favor", () => {
  it("sin saldo, no ofrece nada", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await screen.findByRole("button", { name: /cuerpo full/i });
    expect(screen.queryByLabelText(/saldo a favor/i)).not.toBeInTheDocument();
  });

  it("con saldo, lo ofrece y dice cuánto es", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={110667} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    expect(await screen.findByLabelText(/saldo a favor/i)).toBeInTheDocument();
    expect(screen.getByText(/\$110\.667/)).toBeInTheDocument();
  });

  it("al usarlo, muestra cuánto queda por cobrar", async () => {
    // El pack sale $166.000 y tiene $110.667: faltan $55.333.
    render(<VenderModal customerId="cu1" saldoAFavor={110667} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await userEvent.click(await screen.findByLabelText(/saldo a favor/i));
    expect(await screen.findByText("$55.333")).toBeInTheDocument();
  });

  it("si el saldo cubre todo, lo dice", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={200000} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await userEvent.click(await screen.findByLabelText(/saldo a favor/i));
    expect(await screen.findByText(/queda paga/i)).toBeInTheDocument();
  });

  it("nunca aplica más saldo que el precio de la compra", async () => {
    // Aplicar $200.000 a una compra de $166.000 dejaría un pago de más que
    // después habría que devolver.
    render(<VenderModal customerId="cu1" saldoAFavor={200000} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await userEvent.click(await screen.findByLabelText(/saldo a favor/i));
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));
    await waitFor(() => expect(cuerposDePost).toHaveLength(1));
    expect(cuerposDePost[0]).toMatchObject({ usarSaldo: 166000 });
  });

  it("sin tildarlo, no manda saldo", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={110667} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));
    await waitFor(() => expect(cuerposDePost).toHaveLength(1));
    expect(cuerposDePost[0]).toMatchObject({ usarSaldo: 0 });
  });
});

describe("VenderModal", () => {
  it("separa el catálogo en las cuatro cosas que se venden", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    expect(await screen.findByRole("tab", { name: /packs de depilación/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /combos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /servicios/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /capacitaciones/i })).toBeInTheDocument();
  });

  it("una capacitación se vende entera: no se eligen sesiones", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("tab", { name: /capacitaciones/i }));
    await userEvent.click(await screen.findByRole("button", { name: /formación en depilación/i }));
    expect(await screen.findByLabelText(/sesiones/i)).toBeDisabled();
  });

  it("una solapa vacía dice que no hay nada cargado, no que la búsqueda falló", async () => {
    catalogo.combos = [];
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("tab", { name: /^combos$/i }));
    expect(await screen.findByText(/no hay ninguno cargado/i)).toBeInTheDocument();
  });

  it("el buscador filtra por nombre", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await screen.findByRole("button", { name: /cuerpo full/i });
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), "nada de esto");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /cuerpo full/i })).not.toBeInTheDocument(),
    );
  });

  it("al elegir un pack propone sus sesiones", async () => {
    // 3 es lo que dice la política del combo. Ofrecer otro número sería
    // ofrecer un precio sin descuento sin que se entienda por qué.
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    expect(await screen.findByLabelText(/sesiones/i)).toHaveValue(3);
  });

  it("muestra las dos capas de descuento por separado", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    expect(await screen.findByText("$195.000")).toBeInTheDocument(); // precio de lista
    // Dos veces: en la fila "Con el pack" y otra vez en el total.
    expect(screen.getAllByText("$166.000")).toHaveLength(2);
  });

  it("avisa cuándo el pack deja de descontar", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    const sesiones = screen.getByLabelText(/sesiones/i);
    await userEvent.clear(sesiones);
    await userEvent.type(sesiones, "2");
    expect(await screen.findByText(/se venden al precio de lista/i)).toBeInTheDocument();
  });

  it("con las sesiones del pack dice el descuento, no una advertencia", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    expect(await screen.findByText(/pack de 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/precio de lista, sin descuento/i)).not.toBeInTheDocument();
  });

  it("vender UNA sesión no dispara ninguna advertencia", async () => {
    // Es la operación más común de todas: vender un servicio suelto. Avisarle
    // "sin el descuento del pack" cada vez es ruido sobre lo normal.
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    // `clear` deja el campo en 1: el onChange no admite vacío ni cero.
    await userEvent.clear(await screen.findByLabelText(/sesiones/i));
    await waitFor(() => expect(screen.getByLabelText(/sesiones/i)).toHaveValue(1));
    expect(screen.queryByText(/precio de lista, sin descuento/i)).not.toBeInTheDocument();
  });

  it("sin promos vigentes, no muestra el desplegable de promo", async () => {
    // Un desplegable con una sola opción que dice "Sin promo" no informa nada
    // y hace dudar de para qué está.
    catalogo.promociones = [];
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByLabelText(/sesiones/i);
    expect(screen.queryByLabelText(/promo/i)).not.toBeInTheDocument();
  });

  it("la promo se aplica sobre el precio del pack", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.selectOptions(screen.getByLabelText(/promo/i), "p1");
    // "Con la promo" y el total.
    await waitFor(() => expect(screen.getAllByText("$149.400")).toHaveLength(2));
  });

  async function irACombosYElegir(nombre: RegExp) {
    await userEvent.click(await screen.findByRole("tab", { name: /^combos$/i }));
    await userEvent.click(await screen.findByRole("button", { name: nombre }));
  }

  it("ofrece la promo del combo elegido", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await irACombosYElegir(/combo facial premium/i);
    expect(await screen.findByRole("option", { name: /primavera/i })).toBeInTheDocument();
  });

  it("NO ofrece esa promo con otro combo", async () => {
    // El bug que esto arregla: hoy el desplegable lista TODAS las promos y se
    // le puede aplicar a un Baby Botox una promo pensada para depilación.
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await irACombosYElegir(/combo express/i);
    await screen.findByLabelText(/sesiones/i);
    expect(screen.queryByRole("option", { name: /primavera/i })).not.toBeInTheDocument();
  });

  it("al cambiar de item, deselecciona una promo que dejó de aplicar", async () => {
    // Si queda seleccionada, se vende con un descuento que el backend
    // rechaza y Laura no entiende por qué.
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await irACombosYElegir(/combo facial premium/i);
    await userEvent.selectOptions(await screen.findByLabelText(/promo/i), "p1");
    await userEvent.click(await screen.findByRole("button", { name: /combo express/i }));
    expect(screen.queryByLabelText(/promo/i)).not.toBeInTheDocument();
  });

  it("vende con los montos que se vieron en pantalla", async () => {
    // Lo que se congela es lo cotizado, no una cuenta que el navegador rehaga.
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
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
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await screen.findByRole("button", { name: /cuerpo full/i });
    expect(screen.getByRole("button", { name: /^vender$/i })).toBeDisabled();
  });

  it("al vender NO se cierra: pasa a cobrar", async () => {
    // Antes cerraba y la compra quedaba con $0 pagado diciendo "Debe
    // $166.000", con la clienta esperando en el mostrador.
    const onClose = vi.fn();
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={onClose} />, { wrapper });
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));
    expect(await screen.findByRole("heading", { name: /^cobrar$/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("si el saldo a favor cubre todo, NO pasa a cobrar: cierra", async () => {
    // "Cobrar $0" no significa nada, y la única salida que quedaba era
    // "Cobrar después" — sobre una compra que ya estaba paga.
    const onClose = vi.fn();
    render(
      <VenderModal customerId="cu1" saldoAFavor={999000} onClose={onClose} />,
      { wrapper },
    );
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.click(screen.getByRole("checkbox", { name: /usar.*saldo/i }));
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: /^cobrar$/i })).not.toBeInTheDocument();
  });
});

describe("VenderModal — el paso de cobro", () => {
  async function venderYLlegarACobrar() {
    await elegirCuerpoFull();
    await screen.findByText("$195.000");
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));
    await screen.findByRole("heading", { name: /^cobrar$/i });
  }

  it("propone cobrar todo", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await venderYLlegarACobrar();
    expect(screen.getByLabelText(/monto/i)).toHaveValue(166000);
  });

  it("ofrece la seña del 40%", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await venderYLlegarACobrar();
    await userEvent.click(screen.getByRole("button", { name: /seña 40%/i }));
    expect(screen.getByLabelText(/monto/i)).toHaveValue(66400);
  });

  it("avisa mientras se escribe si el monto no llega al mínimo", async () => {
    // Al lado del número y no como error después de apretar: el que cobra
    // está escribiendo y tiene que verlo mientras.
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await venderYLlegarACobrar();
    const monto = screen.getByLabelText(/monto/i);
    await userEvent.clear(monto);
    await userEvent.type(monto, "50000");
    expect(await screen.findByText(/al menos \$66\.400/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cobrar \$/i })).toBeDisabled();
  });

  it("cobra con el medio y el tilde de factura elegidos", async () => {
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await venderYLlegarACobrar();
    await userEvent.selectOptions(screen.getByLabelText(/medio de pago/i), "debit_card");
    await userEvent.click(screen.getByLabelText(/lleva factura/i));
    await userEvent.click(screen.getByRole("button", { name: /^cobrar \$/i }));
    await waitFor(() => expect(cobros).toHaveLength(1));
    expect(cobros[0]).toMatchObject({ amount: 166000, method: "debit_card", wantsInvoice: true });
  });

  it("se puede cobrar después: la venta ya está hecha", async () => {
    const onClose = vi.fn();
    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={onClose} />, { wrapper });
    await venderYLlegarACobrar();
    await userEvent.click(screen.getByRole("button", { name: /cobrar después/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(cobros).toHaveLength(0);
  });

  it("con saldo a favor aplicado, sólo se cobra lo que falta", async () => {
    // El saldo cubrió $110.667 de $166.000: quedan $55.333, y no hay mínimo
    // porque la clienta ya puso más del 40%.
    render(<VenderModal customerId="cu1" saldoAFavor={110667} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    await userEvent.click(await screen.findByLabelText(/saldo a favor/i));
    await userEvent.click(screen.getByRole("button", { name: /^vender$/i }));
    await screen.findByRole("heading", { name: /^cobrar$/i });
    expect(screen.getByLabelText(/monto/i)).toHaveValue(55333);
    expect(screen.queryByText(/mínimo del primer pago/i)).not.toBeInTheDocument();
  });
});

describe("VenderModal — el catálogo al reabrir", () => {
  /**
   * El combo se carga en el dashboard y se vende acá: son dos aplicaciones
   * distintas, así que el CRM no tiene forma de enterarse de que el catálogo
   * cambió. Si además lo guarda fresco mucho rato, Laura carga un combo, viene
   * a venderlo y no está.
   *
   * Pasó de verdad (2026-09-10): "Combo1 - Prueba" existía en el catálogo del
   * backend y el modal decía "Todavía no hay ninguno cargado en el catálogo".
   */
  it("al reabrirlo aparece un combo cargado mientras tanto", async () => {
    // Un solo cliente para las dos aperturas: en la app real la caché vive en
    // la pestaña, no en el modal.
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const conCache = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const primera = render(
      <VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />,
      { wrapper: conCache },
    );
    await userEvent.click(await screen.findByRole("tab", { name: /^combos$/i }));
    await screen.findByRole("button", { name: /combo facial premium/i });
    primera.unmount();

    catalogo.combos = [
      ...catalogo.combos,
      { origen: "combo", id: "c2", nombre: "Combo1 - Prueba", packSesiones: null, packDescuentoPct: null, precioDesde: 213200 },
    ];


    render(<VenderModal customerId="cu1" saldoAFavor={0} onClose={() => {}} />, {
      wrapper: conCache,
    });
    await userEvent.click(await screen.findByRole("tab", { name: /^combos$/i }));
    expect(await screen.findByRole("button", { name: /combo1 - prueba/i })).toBeInTheDocument();
  });
});

describe("VenderModal — la solapa Promos", () => {
  it("hay una quinta solapa Promos", async () => {
    // Es el pedido que originó todo esto: Laura fue a buscar "promo" en el
    // buscador de items, no encontró nada, y no tenía forma de saber que la
    // promo existía.
    render(<VenderModal customerId="c1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    expect(await screen.findByRole("tab", { name: /promos/i })).toBeInTheDocument();
  });

  it("un paquete se lista con su precio y con lo que lleva adentro", async () => {
    render(<VenderModal customerId="c1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("tab", { name: /promos/i }));
    expect(await screen.findByText(/promo novia/i)).toBeInTheDocument();
    expect(screen.getByText(/limpieza de cutis/i)).toBeInTheDocument();
  });

  it("elegir un paquete lo deja listo para vender de un saque", async () => {
    render(<VenderModal customerId="c1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("tab", { name: /promos/i }));
    await userEvent.click(await screen.findByText(/promo novia/i));
    expect(await screen.findByRole("button", { name: /vender/i })).toBeEnabled();
  });

  it("una promo de DESCUENTO se despliega y deja elegir uno de sus items", async () => {
    // El comportamiento de hoy, pero encontrable (spec §7).
    //
    // OJO: la primera versión de este test hacía sólo
    // `findByText(/baby botox/i)`, que matcheaba el encabezado "Promo Baby
    // Botox" —ya visible ANTES del click— y pasaba igual con el desplegable
    // roto (`{false && (...)}` en vez de `{promoDesplegada === promo.id &&
    // (...)}`). La aserción tiene que recaer sobre el EFECTO de elegir el
    // item: qué se le pide cotizar al backend.
    render(<VenderModal customerId="c1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("tab", { name: /promos/i }));
    await userEvent.click(await screen.findByText(/promo baby botox/i));
    await userEvent.click(await screen.findByRole("button", { name: /venus legacy 1 zona/i }));
    await waitFor(() =>
      expect(
        cotizacionesPedidas.some(
          (b) => b.origen === "servicio" && b.id === "s1" && b.promotionId === "pd1",
        ),
      ).toBe(true),
    );
  });

  it("un paquete no se ofrece como descuento en el desplegable del camino suelto", async () => {
    // Bug real (reportado por el revisor): "Promo Novia" es un paquete cuyo
    // destino es la Limpieza de cutis. Sus destinos apuntan a un servicio de
    // verdad, pero un paquete no es "un descuento que aplica a X" — es una
    // cosa que se vende entera. Si se colara en este desplegable, el backend
    // la aceptaría sin bajar el precio (no tiene discountPercentage ni
    // discountAmount) y de paso le gastaría una unidad de cupo a la promo.
    render(<VenderModal customerId="c1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("tab", { name: /^servicios$/i }));
    await userEvent.click(await screen.findByRole("button", { name: /limpieza de cutis/i }));
    await screen.findByLabelText(/sesiones/i);
    expect(screen.queryByRole("option", { name: /promo novia/i })).not.toBeInTheDocument();
  });

  it("elegir un item suelto después de un paquete elegido suelta el paquete", async () => {
    // Si no se soltara, la pantalla mostraría "Cuerpo Full" pero se seguiría
    // cotizando y vendiendo el paquete de $250.000 — los dos puestos a la vez
    // es un estado imposible.
    render(<VenderModal customerId="c1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("tab", { name: /promos/i }));
    await userEvent.click(await screen.findByText(/promo novia/i));
    await screen.findByRole("button", { name: /^vender$/i });

    await userEvent.click(await screen.findByRole("tab", { name: /packs de depilación/i }));
    await userEvent.click(await screen.findByRole("button", { name: /cuerpo full/i }));

    await waitFor(() =>
      expect(cotizacionesPedidas.at(-1)).toMatchObject({ origen: "depilacion", id: "d1" }),
    );
  });

  it("elegir un paquete después de un item suelto elegido lo suelta", async () => {
    // El desplegable de acá es un <select>, con role "combobox": se busca así
    // (y no con `getByLabelText`) porque la fila del paquete tiene su propio
    // `aria-label="Promo Novia"` y también matchea /promo/i.
    render(<VenderModal customerId="c1" saldoAFavor={0} onClose={() => {}} />, { wrapper });
    await elegirCuerpoFull();
    // Cuerpo Full tiene una promo aplicable (Primavera): el desplegable está.
    expect(await screen.findByRole("combobox", { name: /promo/i })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("tab", { name: /promos/i }));
    await userEvent.click(await screen.findByText(/promo novia/i));

    // El paquete suelta el item elegido: si no lo hiciera, el panel seguiría
    // mostrando Cuerpo Full y el desplegable de Primavera (que le aplica a
    // Cuerpo Full, no al paquete) seguiría visible al lado del paquete.
    await waitFor(() =>
      expect(screen.queryByRole("combobox", { name: /promo/i })).not.toBeInTheDocument(),
    );
  });
});
