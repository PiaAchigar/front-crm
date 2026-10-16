import { describe, expect, it } from "vitest";
import { nombreDeLaLinea } from "./sesion-de-depilacion";

const base = { id: "l1", serviceId: null, serviceName: "Cuerpo Full", repeticion: 2, orden: 1,
  appointmentId: null, appointmentStart: null, consumedAt: null, estado: "disponible" as const, zonasDelTurno: null };

describe("nombreDeLaLinea", () => {
  it("una línea de depilación dice qué sesión es", () => {
    expect(nombreDeLaLinea({ ...base, depilationComboId: "dc1" }, { depilationComboId: "dc1", sessionsTotal: 6 })).toBe("Sesión 2 de 6");
  });
  it("sin total conocido, sólo el número", () => {
    expect(nombreDeLaLinea({ ...base, depilationComboId: "dc1" }, { depilationComboId: "dc1", sessionsTotal: null })).toBe("Sesión 2");
  });
  it("una línea que no es de depilación sigue con su nombre", () => {
    expect(nombreDeLaLinea({ ...base, serviceId: "s1", serviceName: "Limpieza", depilationComboId: null }, { depilationComboId: null, sessionsTotal: 3 })).toBe("Limpieza");
  });
  it("sin nombre ni pack, el guión de siempre", () => {
    expect(nombreDeLaLinea({ ...base, serviceName: null, depilationComboId: null }, { depilationComboId: null, sessionsTotal: null })).toBe("—");
  });
  it("en un paquete, la línea de depilación conserva el nombre del pack", () => {
    expect(nombreDeLaLinea({ ...base, repeticion: 1, depilationComboId: "dc1" }, { depilationComboId: null, sessionsTotal: 1 })).toBe("Cuerpo Full");
  });
});
