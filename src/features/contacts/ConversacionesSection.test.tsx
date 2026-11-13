import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/contacts";
import { ConversacionesSection } from "./ConversacionesSection";

function Ubicacion() {
  const l = useLocation();
  return <div data-testid="url">{l.pathname + l.search}</div>;
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/contactos/A"]}>
        <Routes>
          <Route path="/contactos/:id" element={<ConversacionesSection contactId="A" />} />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const base: api.ConversacionDeContacto = {
  id: "c1",
  channel: "whatsapp",
  status: "open",
  ultimoMensaje: { content: "Hola, quiero un turno", createdAt: "2020-03-05T15:00:00Z", senderType: "contact" },
  cantidadMensajes: 7,
  via: null,
};

describe("ConversacionesSection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("muestra una fila por conversación", async () => {
    vi.spyOn(api, "fetchConversacionesDeContacto").mockResolvedValue({
      conversaciones: [base, { ...base, id: "c2", channel: "web", ultimoMensaje: null, cantidadMensajes: 0 }],
    });
    montar();
    expect(await screen.findByText("“Hola, quiero un turno”")).toBeInTheDocument();
    expect(screen.getByText("7 msj")).toBeInTheDocument();
    expect(screen.getByText("05/03")).toBeInTheDocument();
    expect(screen.getByText("Formulario de la web")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Abrir" })).toHaveLength(2);
    expect(screen.queryByText(/por el/)).not.toBeInTheDocument();
  });

  it("estado vacío", async () => {
    vi.spyOn(api, "fetchConversacionesDeContacto").mockResolvedValue({ conversaciones: [] });
    montar();
    expect(await screen.findByText("Sin conversaciones.")).toBeInTheDocument();
  });

  it("muestra la línea 'por el WhatsApp de' cuando hay via", async () => {
    vi.spyOn(api, "fetchConversacionesDeContacto").mockResolvedValue({
      conversaciones: [
        { ...base, via: { titularId: "T", titularName: "Andrea" } },
        { ...base, id: "c2", via: { titularId: "T", titularName: null } },
      ],
    });
    montar();
    expect(await screen.findByText("por el WhatsApp de Andrea")).toBeInTheDocument();
    expect(screen.getByText("por el WhatsApp de Sin nombre")).toBeInTheDocument();
  });

  it("Abrir navega al Inbox con la conversación", async () => {
    vi.spyOn(api, "fetchConversacionesDeContacto").mockResolvedValue({ conversaciones: [{ ...base, id: "c9" }] });
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    expect(screen.getByTestId("url")).toHaveTextContent("/inbox?conversacion=c9");
  });
});
