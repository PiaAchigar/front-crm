import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/inbox";
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

  it("no se muestra si la conversación no está por revisar", () => {
    render(
      conQuery(
        <BarraPorRevisar
          porRevisar={false}
          conversationId="C1"
          candidatos={candidatos}
          canEdit
          onResolved={() => {}}
        />,
      ),
    );
    expect(screen.queryByText(/lo comparten/)).not.toBeInTheDocument();
  });

  it("muestra cuántas personas comparten el número, y desaparece al resolver", async () => {
    vi.spyOn(api, "resolverContacto").mockResolvedValue({ conversationId: "C1" });
    const props = { conversationId: "C1", candidatos, canEdit: true, onResolved: () => {} };
    const { rerender } = render(conQuery(<BarraPorRevisar {...props} porRevisar />));
    expect(
      screen.getByText("Este número lo comparten 3 personas. ¿Quién es la titular?"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Elegir titular" }));
    expect(screen.getByRole("radio", { name: "Andrea" })).toBeInTheDocument();

    // Al resolver, la conversación se vuelve a pedir con la marca apagada.
    rerender(conQuery(<BarraPorRevisar {...props} porRevisar={false} />));
    expect(screen.queryByText(/lo comparten/)).not.toBeInTheDocument();
  });
});
