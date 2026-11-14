import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/inbox";
import * as deals from "../../api/deals";
import * as contacts from "../../api/contacts";
import { ConversationThread } from "./ConversationThread";

vi.mock("../../lib/session", () => ({ useCrmSession: () => ({ ready: true, role: "admin" }) }));

const msg: api.Message = {
  id: "M1",
  senderType: "agent",
  content: "Hola, ¿cómo estás?",
  mediaUrl: null,
  createdAt: "2026-11-12T10:00:00.000Z",
};

describe("ConversationThread — mensaje duplicado", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(deals, "fetchAgents").mockResolvedValue([]);
    vi.spyOn(api, "fetchConversation").mockResolvedValue({
      conversation: {
        id: "C1", contactId: null, contactName: "Ana", contactPhone: null, contactEmail: null,
        channel: "whatsapp", status: "open", assignedAgentId: null, messageCount: 0,
        needsContactReview: false, lastMessageAt: null, createdAt: "2026-11-12T09:00:00.000Z",
      },
      messages: [],
      oldestCursor: null,
      newestCursor: null,
      hasMoreOlder: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("un mensaje que llega por el polling y después por el envío queda una sola vez", async () => {
    // El polling lo trae antes de que vuelva la respuesta del envío.
    vi.spyOn(api, "fetchMessagesAfter").mockResolvedValue({ messages: [msg], newestCursor: "c" });
    let resolverEnvio!: (m: api.Message) => void;
    vi.spyOn(api, "sendMessage").mockReturnValue(
      new Promise((res) => {
        resolverEnvio = res;
      }),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ConversationThread conversationId="C1" canEdit />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.type(await screen.findByPlaceholderText(/escrib/i), "Hola, ¿cómo estás?");
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });
    expect(screen.getAllByText("Hola, ¿cómo estás?")).toHaveLength(1);
    await act(async () => {
      resolverEnvio(msg);
    });
    expect(screen.getAllByText("Hola, ¿cómo estás?")).toHaveLength(1);
  });
});

describe("ConversationThread — + Guardar cliente", () => {
  function conv(contactName: string | null): api.ConversationDetail {
    return {
      conversation: {
        id: "C1", contactId: "K1", contactName, contactPhone: "5491158499585", contactEmail: null,
        channel: "whatsapp", status: "open", assignedAgentId: null, messageCount: 0,
        needsContactReview: false, lastMessageAt: null, createdAt: "2026-11-12T09:00:00.000Z",
      },
      messages: [], oldestCursor: null, newestCursor: null, hasMoreOlder: false,
    } as api.ConversationDetail;
  }
  function montar(contactName: string | null, compartenNumero: { id: string; name: string | null }[] = []) {
    vi.spyOn(deals, "fetchAgents").mockResolvedValue([]);
    vi.spyOn(api, "fetchConversation").mockResolvedValue(conv(contactName));
    vi.spyOn(api, "fetchMessagesAfter").mockResolvedValue({ messages: [], newestCursor: null });
    vi.spyOn(contacts, "fetchVinculos").mockResolvedValue({
      titular: null, aCargo: [], compartenNumero,
    } as unknown as contacts.Vinculos);
    vi.spyOn(contacts, "fetchUnionPreview").mockResolvedValue({} as contacts.UnionPreview);
    return render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ConversationThread conversationId="C1" canEdit />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }
  afterEach(() => vi.restoreAllMocks());

  it("ya no existe Simular entrante", async () => {
    montar(null);
    await screen.findByText(/Sin contacto/);
    expect(screen.queryByRole("button", { name: /simular entrante/i })).toBeNull();
  });

  it("el botón sólo aparece si la ficha no tiene nombre", async () => {
    const { unmount } = montar("5491158499585");
    expect(await screen.findByRole("button", { name: /\+ Guardar cliente/ })).toBeTruthy();
    unmount();
    vi.restoreAllMocks();
    montar("Ana Pérez");
    await screen.findByText(/Ana Pérez/);
    expect(screen.queryByRole("button", { name: /Guardar cliente/ })).toBeNull();
  });

  it("guardar manda el PATCH al contacto existente con el nombre unido", async () => {
    montar("5491158499585");
    const patch = vi.spyOn(contacts, "updateContact").mockResolvedValue({} as contacts.Contact);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /\+ Guardar cliente/ }));
    await user.type(screen.getByLabelText(/Nombre/), "Lucía");
    await user.type(screen.getByLabelText(/Apellido/), "Gómez");
    await user.type(screen.getByLabelText(/Email/), "lu@x.com");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(patch).toHaveBeenCalledWith("K1", { name: "Lucía Gómez", email: "lu@x.com" });
  });

  it("si otras fichas comparten el número avisa y abre Unir", async () => {
    montar("5491158499585", [{ id: "K2", name: "Lucía Gómez" }]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /\+ Guardar cliente/ }));
    expect(await screen.findByText("Ya hay 1 ficha con este número: Lucía Gómez.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Es la misma/ }));
    expect(await screen.findByText("Unir con otro contacto")).toBeTruthy();
  });
});
