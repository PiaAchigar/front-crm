import { describe, expect, it } from "vitest";
import { enlaceDeGmail, enlaceDeWhatsApp, metaDeCanal } from "./canal";

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
    // El 9 de celular sin el 54: así lo escribió Pia en su prueba.
    ["91130317884", "5491130317884"],
    ["9 11 3031-7884", "5491130317884"],
    // El 15 de celular viejo, después del 11.
    ["11 15 3031-7884", "5491130317884"],
  ])("%s → wa.me/%s", (tel, numero) => {
    expect(enlaceDeWhatsApp(tel)).toBe(`https://wa.me/${numero}`);
  });

  it("sin teléfono no hay enlace", () => {
    expect(enlaceDeWhatsApp(null)).toBeNull();
    expect(enlaceDeWhatsApp("123")).toBeNull();
  });
});

describe("enlaceDeGmail", () => {
  it("abre el redactor de Gmail con la clienta, el asunto y su consulta citada", () => {
    const url = new URL(
      enlaceDeGmail("ana@ejemplo.com", { nombre: "Ana", consulta: "¿Cuánto sale la limpieza?" }),
    );
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    // Siempre la cuenta del local, aunque el navegador tenga otras abiertas.
    expect(url.searchParams.get("authuser")).toBe("piubellatalar@gmail.com");
    expect(url.searchParams.get("to")).toBe("ana@ejemplo.com");
    expect(url.searchParams.get("su")).toBe("Tu consulta en Piu Bella");
    expect(url.searchParams.get("body")).toBe(
      "Hola Ana,\n\n\n\n> ¿Cuánto sale la limpieza?",
    );
  });

  it("sin consulta, el cuerpo es sólo el saludo", () => {
    const url = new URL(enlaceDeGmail("ana@ejemplo.com", { nombre: null, consulta: null }));
    expect(url.searchParams.get("body")).toBe("Hola,\n\n");
  });
});
