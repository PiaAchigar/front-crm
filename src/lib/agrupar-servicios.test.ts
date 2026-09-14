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

/** Depilación y capacitaciones no se desglosan en servicios: el backend les
 *  devuelve TODAS las filas con `serviceId` y `serviceName` en NULL (el
 *  leftJoin contra `service` no matchea nada). El fallback `?? ""` del
 *  agrupador hace que esas filas colapsen igual que un servicio único —
 *  sin este test, alguien puede "mejorar" ese fallback (agrupando por `id`,
 *  por ejemplo) y romper la ficha de TODAS las compras de depilación, el
 *  área más grande del negocio, sin que ningún test se entere. */
function svcSinCatalogo(id: string, repeticion: number): ServicioComprado {
  return {
    id,
    serviceId: null,
    serviceName: null,
    repeticion,
    orden: 1,
    appointmentId: null,
    appointmentStart: null,
    consumedAt: null,
    estado: "disponible",
  };
}

describe("agruparServicios", () => {
  it("con serviceId y serviceName en null (depilación, capacitaciones) NO agrupa: una lista plana", () => {
    const grupos = agruparServicios([
      svcSinCatalogo("a", 1),
      svcSinCatalogo("b", 2),
      svcSinCatalogo("c", 3),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.titulo).toBeNull();
    expect(grupos[0]!.servicios).toHaveLength(3);
  });

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
