import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/inbox";
import * as deals from "../../api/deals";
import { ConversationThread } from "./ConversationThread";

vi.mock("../../lib/session", () => ({ useCrmSession: () => ({ ready: true, role: "admin" }) }));
vi.mock("../automation/useAutomations", () => ({
  useSimulateInbound: () => ({ isPending: false, mutate: vi.fn() }),
}));

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
