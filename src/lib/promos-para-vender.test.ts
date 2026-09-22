import { describe, expect, it } from "vitest";
import { desgloseDePromo, esPaquete } from "./promos-para-vender";

const catalogo = {
  servicios: [{ id: "s1", nombre: "Limpieza de cutis", origen: "servicio" as const }],
  combos: [{ id: "c1", nombre: "Combo Facial", origen: "combo" as const }],
  depilacion: [{ id: "p1", nombre: "Cuerpo Full", origen: "depilacion" as const }],
  capacitaciones: [],
};

describe("esPaquete", () => {
  it("distingue un paquete de un descuento", () => {
    expect(esPaquete({ promotionType: "paquete" })).toBe(true);
    expect(esPaquete({ promotionType: "percentage" })).toBe(false);
    expect(esPaquete({ promotionType: null })).toBe(false);
  });
});

describe("desgloseDePromo", () => {
  it("resuelve los nombres contra las listas que el modal ya tiene cargadas", () => {
    // Sin llamadas nuevas al backend: el catálogo ya trae todo (spec §7).
    const filas = desgloseDePromo(
      [{ tipo: "servicio", id: "s1", cantidad: 3 }, { tipo: "combo", id: "c1", cantidad: 1 }],
      catalogo,
    );
    expect(filas).toEqual([
      { nombre: "Limpieza de cutis", cantidad: 3 },
      { nombre: "Combo Facial", cantidad: 1 },
    ]);
  });

  it("una cosa que ya no está en el catálogo no rompe la lista", () => {
    // Un servicio archivado después de armar la promo: mejor decir que no se
    // pudo resolver que dejar la pantalla en blanco.
    const filas = desgloseDePromo([{ tipo: "servicio", id: "fantasma", cantidad: 1 }], catalogo);
    expect(filas).toEqual([{ nombre: "(ya no está en el catálogo)", cantidad: 1 }]);
  });

  it("sin destinos devuelve una lista vacía", () => {
    expect(desgloseDePromo([], catalogo)).toEqual([]);
  });
});
