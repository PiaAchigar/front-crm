import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/inbox";
import { useConversationsList } from "./useInbox";

// Pedido de Pia (2026-10-28): una consulta nueva (de la web o de WhatsApp) no
// aparecía en la bandeja hasta recargar la página.
describe("useConversationsList", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("vuelve a pedir la bandeja sola cada 10 segundos", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(api, "fetchConversations").mockResolvedValue([]);
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    renderHook(() => useConversationsList({}), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
