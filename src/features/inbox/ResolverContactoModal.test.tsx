import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/inbox";
import * as contactsApi from "../../api/contacts";
import { BarraPorRevisar } from "./BarraPorRevisar";
import { ResolverContactoModal } from "./ResolverContactoModal";

const candidatos = [
  { id: "A", name: "Andrea" },
  { id: "H", name: "Sofía" },
  { id: "P", name: "Domingo" },
];

function conQuery(ui: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>
  );
}

describe("ResolverContactoModal", () => {
  afterEach(() => vi.restoreAllMocks());

  it("elegir titular y parentesco de cada otro manda el body esperado", async () => {
    const post = vi.spyOn(api, "resolverContacto").mockResolvedValue({ conversationId: "NUEVA" });
    const onResolved = vi.fn();
    render(
      conQuery(
        <ResolverContactoModal
          conversationId="C1"
          candidatos={candidatos}
          onClose={() => {}}
          onResolved={onResolved}
        />,
      ),
    );

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "Andrea" }));
    // Los otros dos piden parentesco; hasta completarlos no se puede guardar.
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText(/Sofía es/), "hija");
    await userEvent.selectOptions(screen.getByLabelText(/Domingo es/), "otro");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/¿Cuál\?/), "vecino");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("C1", {
        titularId: "A",
        otros: [
          { contactId: "H", relationship: "hija" },
          { contactId: "P", relationship: "otro", relationshipOther: "vecino" },
        ],
      }),
    );
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith("NUEVA"));
  });

  it("cambiar de titular cambia quiénes quedan a cargo", async () => {
    const post = vi.spyOn(api, "resolverContacto").mockResolvedValue({ conversationId: "C1" });
    render(
      conQuery(
        <ResolverContactoModal
          conversationId="C1"
          candidatos={candidatos.slice(0, 2)}
          onClose={() => {}}
          onResolved={() => {}}
        />,
      ),
    );
    await userEvent.click(screen.getByRole("radio", { name: "Sofía" }));
    await userEvent.selectOptions(screen.getByLabelText(/Andrea es/), "hija");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("C1", {
        titularId: "H",
        otros: [{ contactId: "A", relationship: "hija" }],
      }),
    );
  });
});

describe("BarraPorRevisar", () => {
  afterEach(() => vi.restoreAllMocks());

  const dos = candidatos.slice(0, 2);
  const preview = {
    conversaciones: 1, turnos: 2, pagos: 0, facturas: 0, compras: 0, aCargo: 0, pierdeTitular: false,
  };
  const base = { conversationId: "C1", contactId: "A", canEdit: true };

  function mocks() {
    vi.spyOn(contactsApi, "fetchContacts").mockResolvedValue({ items: [], total: 0 } as never);
    vi.spyOn(contactsApi, "fetchVinculos").mockResolvedValue({ titular: null, aCargo: [], compartenNumero: [] } as never);
    vi.spyOn(contactsApi, "fetchUnionPreview").mockResolvedValue(preview);
    return {
      unir: vi.spyOn(contactsApi, "unirContactos").mockResolvedValue({ id: "A" }),
      resolver: vi.spyOn(api, "resolverContacto").mockResolvedValue({ conversationId: "C1" }),
    };
  }

  it("no se muestra si la conversación no está por revisar", () => {
    render(
      conQuery(
        <BarraPorRevisar {...base} porRevisar={false} candidatos={candidatos} onResolved={() => {}} />,
      ),
    );
    expect(screen.queryByText(/fichas con este número/)).not.toBeInTheDocument();
  });

  it("pregunta si son la misma persona con la cantidad de fichas", () => {
    render(conQuery(<BarraPorRevisar {...base} porRevisar candidatos={candidatos} onResolved={() => {}} />));
    expect(
      screen.getByText("Hay 3 fichas con este número. ¿Son la misma persona o distintas?"),
    ).toBeInTheDocument();
  });

  it("'Son distintas → Elegir titular' abre el modal de titular", async () => {
    render(conQuery(<BarraPorRevisar {...base} porRevisar candidatos={candidatos} onResolved={() => {}} />));
    await userEvent.click(screen.getByRole("button", { name: "Son distintas → Elegir titular" }));
    expect(screen.getByRole("radio", { name: "Andrea" })).toBeInTheDocument();
  });

  it("'Es la misma → Unir' abre el unir con la otra ficha preseleccionada si son 2", async () => {
    mocks();
    render(conQuery(<BarraPorRevisar {...base} porRevisar candidatos={dos} onResolved={() => {}} />));
    await userEvent.click(screen.getByRole("button", { name: "Es la misma → Unir" }));
    expect(await screen.findByRole("button", { name: "Unir fichas" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Andrea" })).not.toBeInTheDocument();
  });

  it("al unir 2 fichas queda una: resuelve con la que sobrevive", async () => {
    const { unir, resolver } = mocks();
    const onResolved = vi.fn();
    render(conQuery(<BarraPorRevisar {...base} porRevisar candidatos={dos} onResolved={onResolved} />));
    await userEvent.click(screen.getByRole("button", { name: "Es la misma → Unir" }));
    const unirBtn = await screen.findByRole("button", { name: "Unir fichas" });
    await waitFor(() => expect(unirBtn).toBeEnabled());
    await userEvent.click(unirBtn);
    await waitFor(() => expect(unir).toHaveBeenCalledWith("A", "H"));
    await waitFor(() => expect(resolver).toHaveBeenCalledWith("C1", { titularId: "A", otros: [] }));
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith("C1"));
  });

  it("con 3 fichas se elige cuál unir y, al unir, no resuelve (quedan 2)", async () => {
    const { unir, resolver } = mocks();
    render(conQuery(<BarraPorRevisar {...base} porRevisar candidatos={candidatos} onResolved={() => {}} />));
    await userEvent.click(screen.getByRole("button", { name: "Es la misma → Unir" }));
    expect(screen.queryByRole("button", { name: "Unir fichas" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Domingo/ }));
    const unirBtn = await screen.findByRole("button", { name: "Unir fichas" });
    await waitFor(() => expect(unirBtn).toBeEnabled());
    await userEvent.click(unirBtn);
    await waitFor(() => expect(unir).toHaveBeenCalledWith("A", "P"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Unir fichas" })).not.toBeInTheDocument());
    expect(resolver).not.toHaveBeenCalled();
  });
});
