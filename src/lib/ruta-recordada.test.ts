import { afterEach, describe, expect, it, vi } from "vitest";
import { destinoDeArranque, guardarRuta, rutaGuardada } from "./ruta-recordada";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("ruta recordada", () => {
  it("guarda y devuelve la pantalla", () => {
    guardarRuta("crm:ruta", "/contactos/123");
    expect(rutaGuardada("crm:ruta")).toBe("/contactos/123");
  });

  it("sin nada guardado devuelve null", () => {
    expect(rutaGuardada("crm:ruta")).toBeNull();
  });

  it("si el navegador no deja leer el storage, no rompe", () => {
    // Modo privado, cookies bloqueadas: `sessionStorage` puede TIRAR al
    // tocarlo, no sólo venir vacío. Arrancar donde siempre es la salida
    // correcta; reventar la pantalla no.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(rutaGuardada("crm:ruta")).toBeNull();
  });

  it("si no deja escribir, tampoco", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => guardarRuta("crm:ruta", "/pipeline")).not.toThrow();
  });
});

describe("destinoDeArranque", () => {
  it("va a lo guardado", () => {
    expect(destinoDeArranque("/contactos/123", "/inbox")).toBe("/contactos/123");
  });

  it("la primera vez, a la pantalla de siempre", () => {
    expect(destinoDeArranque(null, "/inbox")).toBe("/inbox");
  });

  it("nunca a la raíz: sería redirigirse a sí misma para siempre", () => {
    expect(destinoDeArranque("/", "/inbox")).toBe("/inbox");
  });
});
