import { describe, expect, it } from "vitest";
import {
  ahorro,
  estadoDeCompra,
  etiquetaDeSesion,
  pesos,
  progresoDeSesiones,
  puedeAgendar,
} from "./compras-ui";
import type { Compra, ServicioComprado } from "../api/compras";

const svcBase: ServicioComprado = {
  id: "sv1", serviceId: "s1", serviceName: "Baby Botox",
  repeticion: 1, orden: 1, appointmentId: null, appointmentStart: null,
  consumedAt: null, estado: "disponible" as const,
};

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
  devuelta: false,
  devuelto: 0,
  consumidas: 0,
  perdidas: 0,
  usadas: 0,
  agendadas: 0,
  disponibles: 3,
  vencidas: 0,
  pagado: 0,
  saldo: 166000,
  saldada: false,
  servicios: [],
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
  it("parte la barra: lo hecho por un lado y lo perdido por el otro", () => {
    // 3 servicios: 1 hecho, 1 perdido, 1 a agendar.
    const p = progresoDeSesiones({
      ...base, consumidas: 1, perdidas: 1, usadas: 2, servicios: [
        { ...svcBase, id: "a" }, { ...svcBase, id: "b" }, { ...svcBase, id: "c" },
      ],
    });
    expect(p.texto).toBe("2 de 3 servicios usados");
    expect(p.porcentajeHecho).toBe(33);
    expect(p.porcentajePerdido).toBe(33);
  });

  it("sin perdidos, el tramo rojo es cero y la barra queda de un solo color", () => {
    const p = progresoDeSesiones({
      ...base, consumidas: 2, perdidas: 0, usadas: 2, servicios: [
        { ...svcBase, id: "a" }, { ...svcBase, id: "b" },
      ],
    });
    expect(p.porcentajeHecho).toBe(100);
    expect(p.porcentajePerdido).toBe(0);
  });

  it("una compra sin servicios no divide por cero", () => {
    const p = progresoDeSesiones({ ...base, consumidas: 0, perdidas: 0, usadas: 0, servicios: [] });
    expect(p.porcentajeHecho).toBe(0);
    expect(p.porcentajePerdido).toBe(0);
  });
});

describe("etiquetaDeSesion", () => {
  it("traduce los cinco estados al vocabulario de la ficha", () => {
    expect(etiquetaDeSesion("consumida").texto).toBe("Hecho");
    expect(etiquetaDeSesion("perdida").texto).toBe("Perdido");
    expect(etiquetaDeSesion("agendada").texto).toBe("Agendado");
    expect(etiquetaDeSesion("disponible").texto).toBe("A agendar");
    expect(etiquetaDeSesion("vencida").texto).toBe("Vencido");
  });

  it("hecho en verde y perdido en rojo, que es lo que los distingue de un vistazo", () => {
    expect(etiquetaDeSesion("consumida").clase).toMatch(/emerald/);
    expect(etiquetaDeSesion("perdida").clase).toMatch(/rose/);
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
