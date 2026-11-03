import { afterEach, describe, expect, it, vi } from "vitest";
import { enDias } from "./AplazarDialog";
import { fechaInicialDeAplazo } from "./ComprasCard";

// A las 22:00 hora local, en Argentina (UTC-3) ya es el día siguiente en UTC:
// toISOString().slice(0, 10) proponía un día de más.
describe("fechas sugeridas para aplazar, de noche", () => {
  afterEach(() => vi.useRealTimers());

  it("enDias usa la fecha local", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 9, 22, 30));
    expect(enDias(0)).toBe("2026-12-09");
    expect(enDias(1)).toBe("2026-12-10");
  });

  it("fechaInicialDeAplazo de una compra vencida es hoy local + 30", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 9, 22, 30));
    expect(fechaInicialDeAplazo(new Date(2020, 0, 1).toISOString())).toBe("2027-01-08");
  });
});
