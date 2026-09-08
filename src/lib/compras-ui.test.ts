import { describe, expect, it } from "vitest";
import {
  ahorro,
  estadoDeCompra,
  etiquetaDeSesion,
  pesos,
  progresoDeSesiones,
  puedeAgendar,
} from "./compras-ui";
import type { Compra } from "../api/compras";

const base: Compra = {
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
  consumidas: 0,
  agendadas: 0,
  disponibles: 3,
  vencidas: 0,
  pagado: 0,
  saldo: 166000,
  saldada: false,
  sessions: [],
};

describe("pesos", () => {
  it("pone el separador de miles y no decimales", () => {
    expect(pesos(166000)).toBe("$166.000");
  });

  it("redondea al peso: los centavos no se cobran", () => {
    expect(pesos(45900.4)).toBe("$45.900");
  });

  it("el cero es cero, no un guión", () => {
    // Un saldo en cero es información: está saldada. Un guión diría "no sé".
    expect(pesos(0)).toBe("$0");
  });
});

describe("estadoDeCompra", () => {
  it("cancelada gana sobre todo lo demás", () => {
    const c = { ...base, cancelledAt: "2026-09-09T10:00:00.000Z", saldada: true };
    expect(estadoDeCompra(c).texto).toBe("Cancelada");
  });

  it("con saldo dice cuánto falta", () => {
    expect(estadoDeCompra({ ...base, pagado: 100000, saldo: 66000 }).texto).toBe("Debe $66.000");
  });

  it("sin saldo está paga", () => {
    expect(estadoDeCompra({ ...base, pagado: 166000, saldo: 0, saldada: true }).texto).toBe("Paga");
  });

  it("vencida se avisa aunque esté paga", () => {
    // Pagó y no la usó: es lo que Laura más necesita ver.
    const c = { ...base, saldada: true, saldo: 0, vencidas: 3, disponibles: 0 };
    expect(estadoDeCompra(c).texto).toBe("Vencida");
  });

  it("cada estado trae sus clases escritas enteras", () => {
    // Tailwind lee el código como texto: una clase armada en runtime nunca se
    // compila y el color no aparece.
    for (const c of [base, { ...base, cancelledAt: "x" }, { ...base, saldada: true, saldo: 0 }]) {
      expect(estadoDeCompra(c).clase).toMatch(/^bg-\S+ text-\S+$/);
    }
  });
});

describe("progresoDeSesiones", () => {
  it("cuenta usadas sobre el total", () => {
    const c = { ...base, consumidas: 1, agendadas: 1, disponibles: 1 };
    expect(progresoDeSesiones(c).texto).toBe("1 de 3 usadas");
  });

  it("el porcentaje es el de las consumidas", () => {
    // Agendada no es usada: el turno puede cancelarse y la sesión vuelve.
    const c = { ...base, consumidas: 1, agendadas: 2, disponibles: 0 };
    expect(progresoDeSesiones(c).porcentaje).toBe(33);
  });

  it("sin sesiones no divide por cero", () => {
    expect(progresoDeSesiones({ ...base, sessionsTotal: 0 }).porcentaje).toBe(0);
  });

  it("todo consumido es 100", () => {
    expect(progresoDeSesiones({ ...base, consumidas: 3, disponibles: 0 }).porcentaje).toBe(100);
  });
});

describe("etiquetaDeSesion", () => {
  it("traduce los cuatro estados", () => {
    expect(etiquetaDeSesion("consumida").texto).toBe("Consumida");
    expect(etiquetaDeSesion("agendada").texto).toBe("Agendada");
    expect(etiquetaDeSesion("disponible").texto).toBe("Disponible");
    expect(etiquetaDeSesion("vencida").texto).toBe("Vencida");
  });

  it("las clases van escritas enteras", () => {
    expect(etiquetaDeSesion("consumida").clase).toMatch(/^bg-\S+ text-\S+$/);
  });
});

describe("ahorro", () => {
  it("es lo que se descontó contra el precio de lista", () => {
    expect(ahorro(base)).toBe(29000);
  });

  it("cuenta también la promo", () => {
    expect(ahorro({ ...base, finalAmount: 150000 })).toBe(45000);
  });

  it("sin descuento es cero y no se muestra", () => {
    expect(ahorro({ ...base, baseAmount: 166000 })).toBe(0);
  });
});

describe("puedeAgendar", () => {
  it("con sesiones disponibles, sí", () => {
    expect(puedeAgendar(base)).toBe(true);
  });

  it("cancelada, no", () => {
    expect(puedeAgendar({ ...base, cancelledAt: "2026-09-09T10:00:00.000Z" })).toBe(false);
  });

  it("sin disponibles, no", () => {
    expect(puedeAgendar({ ...base, disponibles: 0, agendadas: 3 })).toBe(false);
  });
});
