import { describe, expect, it } from "vitest";
import { etiquetaAgente } from "./etiqueta-agente";

describe("etiquetaAgente", () => {
  it("usa el nombre corto que manda la API", () => {
    expect(etiquetaAgente({ nombreCorto: "Lucía Ce.", fullName: "Lucía Celano", email: "l@x.com" })).toBe("Lucía Ce.");
  });
  it("sin nombreCorto cae al nombre y después al email", () => {
    expect(etiquetaAgente({ fullName: "Laura", email: "l@x.com" })).toBe("Laura");
    expect(etiquetaAgente({ fullName: null, email: "l@x.com" })).toBe("l@x.com");
    expect(etiquetaAgente({ fullName: null, email: null })).toBe("Sin nombre");
  });
});
