import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/inbox";
import { ConversationList } from "./ConversationList";

const base: api.Conversation = {
  id: "1",
  contactId: "c",
  contactName: "Ana",
  contactPhone: null,
  contactEmail: null,
  channel: "whatsapp",
  status: "open",
  assignedAgentId: null,
  messageCount: 1,
  needsContactReview: false,
  lastMessageAt: null,
  lastMessagePreview: "hola",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("ConversationList — Por revisar", () => {
  afterEach(() => vi.restoreAllMocks());

  it("la etiqueta sólo aparece en las conversaciones con needsContactReview", async () => {
    vi.spyOn(api, "fetchConversations").mockResolvedValue([
      { ...base, id: "1", contactName: "Ana" },
      { ...base, id: "2", contactName: "Beatriz", needsContactReview: true },
    ]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConversationList selectedId={null} onSelect={() => {}} canEdit onNew={() => {}} />
      </QueryClientProvider>,
    );
    const beatriz = (await screen.findByText(/Beatriz/)).closest("button")!;
    expect(beatriz).toHaveTextContent("Por revisar");
    expect(screen.getByText(/Ana/).closest("button")).not.toHaveTextContent("Por revisar");
    expect(screen.getAllByText("Por revisar")).toHaveLength(1);
  });
});
