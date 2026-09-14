import { describe, expect, it } from "vitest";
import { agruparServicios } from "./agrupar-servicios";
import type { ServicioComprado } from "../api/compras";

function svc(
  id: string,
  serviceName: string,
  repeticion: number,
): ServicioComprado {
  return {
    id,
    serviceId: `s-${serviceName}`,
    serviceName,
    repeticion,
    orden: 1,
    appointmentId: null,
    appointmentStart: null,
    consumedAt: null,
    estado: "disponible",
  };
}

describe("agruparServicios", () => {
  it("con un solo servicio y 3 vueltas NO agrupa: una lista plana", () => {
    // Un pack de depilación se sigue viendo como hoy, sin un nivel de más.
    const grupos = agruparServicios([
      svc("a", "Lifting", 1),
      svc("b", "Lifting", 2),
      svc("c", "Lifting", 3),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.titulo).toBeNull();
    expect(grupos[0]!.servicios).toHaveLength(3);
  });

  it("con 2 servicios y 3 vueltas da 3 grupos de 2, titulados", () => {
    const grupos = agruparServicios([
      svc("a", "Baby Botox", 1), svc("b", "Depilación facial", 1),
      svc("c", "Baby Botox", 2), svc("d", "Depilación facial", 2),
      svc("e", "Baby Botox", 3), svc("f", "Depilación facial", 3),
    ]);
    expect(grupos).toHaveLength(3);
    expect(grupos.map((g) => g.titulo)).toEqual(["Combo 1", "Combo 2", "Combo 3"]);
    expect(grupos.every((g) => g.servicios.length === 2)).toBe(true);
  });

  it("con 2 servicios y 1 sola vuelta agrupa pero sin título", () => {
    // Un encabezado para un único grupo es ruido.
    const grupos = agruparServicios([
      svc("a", "Baby Botox", 1),
      svc("b", "Depilación facial", 1),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.titulo).toBeNull();
    expect(grupos[0]!.servicios).toHaveLength(2);
  });

  it("sin servicios devuelve una lista vacía, no un grupo vacío", () => {
    expect(agruparServicios([])).toEqual([]);
  });
});
