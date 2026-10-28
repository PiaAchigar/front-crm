import { describe, expect, it } from "vitest";
import { enlaceDeWhatsApp, metaDeCanal } from "./canal";

describe("metaDeCanal", () => {
  it("las consultas del formulario de la web tienen nombre propio", () => {
    expect(metaDeCanal("web")).toEqual({ label: "Formulario de la web", icon: "🌐" });
  });

  it("los canales configurables salen de CHANNEL_META", () => {
    expect(metaDeCanal("whatsapp")?.label).toBe("WhatsApp");
  });

  it("un canal desconocido o vacío no tiene meta", () => {
    expect(metaDeCanal("telegram")).toBeNull();
    expect(metaDeCanal(null)).toBeNull();
  });
});

describe("enlaceDeWhatsApp — el teléfono como lo escribió la clienta en la web", () => {
  it.each([
    ["+54 9 11 5555-0001", "5491155550001"],
    ["11 5555-0001", "5491155550001"],
    ["011 5555 0001", "5491155550001"],
    ["54 11 5555 0001", "5491155550001"],
    ["0054 9 11 5555 0001", "5491155550001"],
  ])("%s → wa.me/%s", (tel, numero) => {
    expect(enlaceDeWhatsApp(tel)).toBe(`https://wa.me/${numero}`);
  });

  it("sin teléfono no hay enlace", () => {
    expect(enlaceDeWhatsApp(null)).toBeNull();
    expect(enlaceDeWhatsApp("123")).toBeNull();
  });
});
