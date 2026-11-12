import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const embed = vi.hoisted(() => ({ abrir: null as null | ((id: string) => void) }));
vi.mock("../../lib/embed", () => ({
  isEmbedded: true,
  escucharAbrirConversacion: (cb: (id: string) => void) => {
    embed.abrir = cb;
    return () => {
      embed.abrir = null;
    };
  },
}));

import { useIrAlInboxAlAbrir } from "./useIrAlInboxAlAbrir";

function montar(ruta: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>
  );
  return renderHook(() => ({ loc: useLocation(), _: useIrAlInboxAlAbrir() }), { wrapper });
}

describe("useIrAlInboxAlAbrir", () => {
  it("desde otra pantalla navega al Inbox con la conversación", () => {
    const { result } = montar("/contactos");
    embed.abrir?.("C3");
    return vi.waitFor(() => {
      expect(result.current.loc.pathname).toBe("/inbox");
      expect(result.current.loc.search).toBe("?conversacion=C3");
    });
  });
  it("ya en el Inbox no navega (lo resuelve InboxPage)", () => {
    const { result } = montar("/inbox");
    embed.abrir?.("C3");
    expect(result.current.loc.pathname).toBe("/inbox");
    expect(result.current.loc.search).toBe("");
  });
});
