import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://dashboard.test";

async function cargar() {
  vi.resetModules();
  vi.stubEnv("VITE_DASHBOARD_ORIGIN", ORIGIN);
  window.history.replaceState({}, "", "/inbox?embed=1");
  return import("./embed");
}

describe("embed — avisos", () => {
  let parent: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    parent = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("pedirSilenciarAvisos manda el mensaje al origin del dashboard", async () => {
    const { pedirSilenciarAvisos } = await cargar();
    pedirSilenciarAvisos(true);
    expect(parent).toHaveBeenCalledWith(
      { type: "piubella:crm:avisos-silenciar", silenciado: true },
      ORIGIN,
    );
  });

  it("avisarConversacionAbierta manda el id, o null", async () => {
    const { avisarConversacionAbierta } = await cargar();
    avisarConversacionAbierta("C1");
    avisarConversacionAbierta(null);
    expect(parent).toHaveBeenNthCalledWith(
      1,
      { type: "piubella:crm:viendo", conversationId: "C1" },
      ORIGIN,
    );
    expect(parent).toHaveBeenNthCalledWith(
      2,
      { type: "piubella:crm:viendo", conversationId: null },
      ORIGIN,
    );
  });

  it("escucharEstadoAvisos acepta el origin del dashboard e ignora los demás", async () => {
    const { escucharEstadoAvisos } = await cargar();
    const cb = vi.fn();
    const stop = escucharEstadoAvisos(cb);
    const msg = { type: "piubella:crm:avisos-estado", silenciado: true };
    window.dispatchEvent(new MessageEvent("message", { data: msg, origin: "https://otro.test" }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new MessageEvent("message", { data: msg, origin: ORIGIN }));
    expect(cb).toHaveBeenCalledWith(true);
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "otra-cosa", silenciado: false }, origin: ORIGIN }),
    );
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    window.dispatchEvent(new MessageEvent("message", { data: msg, origin: ORIGIN }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("escucharEstadoAvisos pide el estado al dashboard después de registrar el listener", async () => {
    const { escucharEstadoAvisos } = await cargar();
    const stop = escucharEstadoAvisos(vi.fn());
    expect(parent).toHaveBeenCalledWith({ type: "piubella:crm:avisos-pedir-estado" }, ORIGIN);
    stop();
  });

  it("escucharAbrirConversacion acepta el origin del dashboard e ignora los demás", async () => {
    const { escucharAbrirConversacion } = await cargar();
    const cb = vi.fn();
    const stop = escucharAbrirConversacion(cb);
    const msg = { type: "piubella:crm:abrir", conversationId: "C5" };
    window.dispatchEvent(new MessageEvent("message", { data: msg, origin: "https://otro.test" }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new MessageEvent("message", { data: { type: "piubella:crm:abrir" }, origin: ORIGIN }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new MessageEvent("message", { data: msg, origin: ORIGIN }));
    expect(cb).toHaveBeenCalledWith("C5");
    stop();
    window.dispatchEvent(new MessageEvent("message", { data: msg, origin: ORIGIN }));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
