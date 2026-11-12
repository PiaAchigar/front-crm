import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxPage } from "./InboxPage";

const embed = vi.hoisted(() => ({
  isEmbedded: true,
  estado: null as null | ((s: boolean) => void),
  silenciar: vi.fn(),
  viendo: vi.fn(),
}));
vi.mock("../../lib/embed", () => ({
  get isEmbedded() {
    return embed.isEmbedded;
  },
  escucharEstadoAvisos: (cb: (s: boolean) => void) => {
    embed.estado = cb;
    return () => {
      embed.estado = null;
    };
  },
  pedirSilenciarAvisos: embed.silenciar,
  avisarConversacionAbierta: embed.viendo,
}));
vi.mock("../../lib/session", () => ({ useCrmSession: () => ({ ready: true, role: "admin" }) }));
vi.mock("./ConversationList", () => ({
  ConversationList: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect("C2")}>elegir C2</button>
  ),
}));
vi.mock("./ConversationThread", () => ({
  ConversationThread: ({ conversationId }: { conversationId: string }) => <p>hilo {conversationId}</p>,
}));
vi.mock("./NewConversationModal", () => ({ NewConversationModal: () => null }));

function montar(url = "/inbox?embed=1") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <InboxPage />
    </MemoryRouter>,
  );
}

describe("InboxPage — avisos", () => {
  beforeEach(() => {
    embed.isEmbedded = true;
    embed.silenciar.mockClear();
    embed.viendo.mockClear();
  });

  it("embebido: botón para silenciar; al tocarlo lo pide y al recibir el estado cambia el texto", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "🔔 Silenciar notificaciones" }));
    expect(embed.silenciar).toHaveBeenCalledWith(true);
    act(() => embed.estado?.(true));
    await userEvent.click(screen.getByRole("button", { name: "🔕 Activar notificaciones" }));
    expect(embed.silenciar).toHaveBeenLastCalledWith(false);
  });

  it("suelto (sin embed) no muestra el botón", () => {
    embed.isEmbedded = false;
    montar("/inbox");
    expect(screen.queryByRole("button", { name: /notificaciones/ })).toBeNull();
  });

  it("la selección inicial sale de ?conversacion= y se informa al dashboard", () => {
    montar("/inbox?embed=1&conversacion=C9");
    expect(screen.getByText("hilo C9")).toBeInTheDocument();
    expect(embed.viendo).toHaveBeenLastCalledWith("C9");
  });

  it("al cambiar la selección avisa; al desmontar manda null", async () => {
    const { unmount } = montar();
    await userEvent.click(screen.getByRole("button", { name: "elegir C2" }));
    expect(embed.viendo).toHaveBeenLastCalledWith("C2");
    unmount();
    expect(embed.viendo).toHaveBeenLastCalledWith(null);
  });
});
