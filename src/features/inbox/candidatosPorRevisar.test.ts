import { describe, expect, it } from "vitest";
import { candidatosPorRevisar } from "./candidatosPorRevisar";

const actual = { id: "Y", name: "Y" };

describe("candidatosPorRevisar", () => {
  it("incluye a la titular del contacto actual y a los que comparten número", () => {
    const r = candidatosPorRevisar(actual, {
      titular: { id: "X", name: "X", relationship: "hijo", relationshipOther: null },
      compartenNumero: [{ id: "Z", name: "Z" }],
    });
    expect(r.map((c) => c.id)).toEqual(["Y", "X", "Z"]);
  });

  it("sin duplicados si la titular también figura en compartenNumero", () => {
    const r = candidatosPorRevisar(actual, {
      titular: { id: "X", name: "X", relationship: null, relationshipOther: null },
      compartenNumero: [{ id: "X", name: "X" }, { id: "Y", name: "Y" }],
    });
    expect(r.map((c) => c.id)).toEqual(["Y", "X"]);
  });

  it("sin titular ni vínculos cargados: sólo la actual y los que comparten", () => {
    expect(candidatosPorRevisar(actual, undefined).map((c) => c.id)).toEqual(["Y"]);
    expect(
      candidatosPorRevisar(actual, { titular: null, compartenNumero: [{ id: "Z", name: "Z" }] }).map((c) => c.id),
    ).toEqual(["Y", "Z"]);
  });
});
