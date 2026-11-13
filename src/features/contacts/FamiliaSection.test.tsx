import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/contacts";
import { ApiError } from "../../api/client";
import { FamiliaSection } from "./FamiliaSection";

const contacto = {
  id: "A",
  name: "Andrea",
  phone: "5491130317884",
  whatsappId: "5491130317884",
} as api.Contact;

function montar(c: api.Contact = contacto) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <FamiliaSection contact={c} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const vacio: api.Vinculos = { titular: null, aCargo: [], compartenNumero: [] };

describe("FamiliaSection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("titular: muestra el número y sus personas a cargo con enlace", async () => {
    vi.spyOn(api, "fetchVinculos").mockResolvedValue({
      ...vacio,
      aCargo: [{ id: "D", name: "Domingo", relationship: "pareja", relationshipOther: null }],
    });
    montar();
    expect(await screen.findByText("Titular de 5491130317884")).toBeInTheDocument();
    expect(screen.getByText("Está a cargo de:")).toBeInTheDocument();
    expect(screen.getByText(/\(Pareja\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Domingo" })).toHaveAttribute("href", "/contactos/D");
  });

  it("a cargo: muestra de quién usa el WhatsApp y el parentesco", async () => {
    vi.spyOn(api, "fetchVinculos").mockResolvedValue({
      ...vacio,
      titular: { id: "T", name: "Andrea", relationship: "hija", relationshipOther: null },
    });
    montar({ ...contacto, id: "H", name: "Sofía" });
    const p = (await screen.findByText(/está a cargo de Sofía/)).closest("p")!;
    expect(p).toHaveTextContent("Andrea está a cargo de Sofía (Sofía es su hija) · usa su WhatsApp");
    expect(screen.getByRole("link", { name: "Andrea" })).toHaveAttribute("href", "/contactos/T");
  });

  it("'otro' muestra el texto aclarado", async () => {
    vi.spyOn(api, "fetchVinculos").mockResolvedValue({
      ...vacio,
      aCargo: [{ id: "V", name: "Marta", relationship: "otro", relationshipOther: "vecina" }],
    });
    montar();
    expect(await screen.findByText(/\(vecina\)/)).toBeInTheDocument();
  });

  it("comparten el número: Vincular abre el parentesco y manda el PUT a la persona elegida", async () => {
    vi.spyOn(api, "fetchVinculos").mockResolvedValue({
      ...vacio,
      compartenNumero: [{ id: "X", name: "Lucía" }],
    });
    const put = vi.spyOn(api, "setTitular").mockResolvedValue(vacio);
    montar();
    expect(await screen.findByText("Comparten este número")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Vincular" }));
    await userEvent.selectOptions(screen.getByLabelText(/parentesco/i), "otro");
    await userEvent.type(screen.getByLabelText(/cuál/i), "amiga");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("X", {
        holderContactId: "A",
        relationship: "otro",
        relationshipOther: "amiga",
      }),
    );
  });

  it("si esta ficha está a cargo de otra, no ofrece Vincular", async () => {
    vi.spyOn(api, "fetchVinculos").mockResolvedValue({
      titular: { id: "T", name: "Andrea", relationship: "hija", relationshipOther: null },
      aCargo: [],
      compartenNumero: [{ id: "X", name: "Lucía" }],
    });
    montar({ ...contacto, id: "H", name: "Sofía" });
    expect(await screen.findByText("Comparten este número")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vincular" })).not.toBeInTheDocument();
  });

  describe("Unir con otro contacto", () => {
    function preparar() {
      vi.spyOn(api, "fetchVinculos").mockResolvedValue(vacio);
      vi.spyOn(api, "fetchContacts").mockResolvedValue({
        items: [
          { id: "A", name: "Andrea" } as api.Contact,
          { id: "B", name: "Andrea P.", phone: "1130317884" } as api.Contact,
        ],
        total: 2,
      });
    }

    async function hastaElPreview() {
      montar();
      await userEvent.click(await screen.findByRole("button", { name: "Unir con otro contacto" }));
      await userEvent.type(screen.getByPlaceholderText(/buscar/i), "andrea");
      // La propia ficha no aparece como candidata.
      expect(await screen.findByRole("button", { name: /Andrea P\./ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Andrea$/ })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /Andrea P\./ }));
    }

    it("busca, muestra qué se mueve y une", async () => {
      preparar();
      vi.spyOn(api, "fetchUnionPreview").mockResolvedValue({
        conversaciones: 1, turnos: 3, pagos: 0, facturas: 0, compras: 0, aCargo: 0, pierdeTitular: false,
      });
      const unir = vi.spyOn(api, "unirContactos").mockResolvedValue({ id: "A" });
      await hastaElPreview();
      expect(
        await screen.findByText("Se pasan 3 turnos y 1 conversación de Andrea P. a Andrea. Andrea P. se borra."),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Unir fichas" }));
      await waitFor(() => expect(unir).toHaveBeenCalledWith("A", "B"));
    });

    it("avisa con el nombre del titular si la ficha que queda pierde a su titular", async () => {
      vi.spyOn(api, "fetchVinculos").mockResolvedValue({
        ...vacio,
        titular: { id: "T", name: "Marta", relationship: "madre", relationshipOther: null },
      });
      vi.spyOn(api, "fetchContacts").mockResolvedValue({
        items: [{ id: "B", name: "Andrea P.", phone: "1130317884" } as api.Contact],
        total: 1,
      });
      vi.spyOn(api, "fetchUnionPreview").mockResolvedValue({
        conversaciones: 0, turnos: 0, pagos: 0, facturas: 0, compras: 0, aCargo: 1, pierdeTitular: true,
      });
      await hastaElPreview();
      expect(
        await screen.findByText(
          "Ojo: Marta deja de estar a cargo de Andrea, porque Andrea pasa a tener a cargo a las personas de Andrea P..",
        ),
      ).toBeInTheDocument();
    });

    it("sin el nombre del titular usa el texto alternativo", async () => {
      preparar();
      vi.spyOn(api, "fetchUnionPreview").mockResolvedValue({
        conversaciones: 0, turnos: 0, pagos: 0, facturas: 0, compras: 0, aCargo: 1, pierdeTitular: true,
      });
      await hastaElPreview();
      expect(
        await screen.findByText(
          "Ojo: Andrea deja de estar tutelado/a, porque pasa a tener a cargo a las personas de Andrea P..",
        ),
      ).toBeInTheDocument();
    });

    it("al unir se invalidan compras, saldo y saldos vencidos", async () => {
      preparar();
      vi.spyOn(api, "fetchUnionPreview").mockResolvedValue({
        conversaciones: 0, turnos: 0, pagos: 0, facturas: 0, compras: 0, aCargo: 0, pierdeTitular: false,
      });
      vi.spyOn(api, "unirContactos").mockResolvedValue({ id: "A" });
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const inv = vi.spyOn(qc, "invalidateQueries");
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <FamiliaSection contact={contacto} />
          </MemoryRouter>
        </QueryClientProvider>,
      );
      await userEvent.click(await screen.findByRole("button", { name: "Unir con otro contacto" }));
      await userEvent.type(screen.getByPlaceholderText(/buscar/i), "andrea");
      await userEvent.click(await screen.findByRole("button", { name: /Andrea P\./ }));
      await userEvent.click(await screen.findByRole("button", { name: "Unir fichas" }));
      await waitFor(() => {
        const claves = inv.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0]);
        expect(claves).toEqual(expect.arrayContaining(["compras", "saldo", "saldos-vencidos"]));
      });
    });

    it("409: muestra el mensaje que manda la API (DNI distinto)", async () => {
      preparar();
      vi.spyOn(api, "fetchUnionPreview").mockResolvedValue({
        conversaciones: 0, turnos: 0, pagos: 0, facturas: 0, compras: 0, aCargo: 0, pierdeTitular: false,
      });
      vi.spyOn(api, "unirContactos").mockRejectedValue(
        new ApiError(409, "No se pueden unir: tienen DNI o CUIT distintos"),
      );
      await hastaElPreview();
      await userEvent.click(await screen.findByRole("button", { name: "Unir fichas" }));
      expect(
        await screen.findByText("No se pueden unir: tienen DNI o CUIT distintos"),
      ).toBeInTheDocument();
    });

    it("409 por el mismo turno: no dice DNI, muestra el mensaje de la API", async () => {
      preparar();
      vi.spyOn(api, "fetchUnionPreview").mockResolvedValue({
        conversaciones: 0, turnos: 0, pagos: 0, facturas: 0, compras: 0, aCargo: 0, pierdeTitular: false,
      });
      vi.spyOn(api, "unirContactos").mockRejectedValue(
        new ApiError(409, "Las dos fichas tienen el mismo turno. Cancelá uno antes de unir"),
      );
      await hastaElPreview();
      await userEvent.click(await screen.findByRole("button", { name: "Unir fichas" }));
      expect(await screen.findByText(/Cancelá uno antes de unir/)).toBeInTheDocument();
      expect(screen.queryByText(/DNI o CUIT/)).not.toBeInTheDocument();
    });
  });
  describe("Desvincular", () => {
    const conTitular: api.Vinculos = {
      ...vacio,
      titular: { id: "T", name: "Andrea", relationship: "hija", relationshipOther: null },
    };

    async function abrir() {
      const put = vi.spyOn(api, "setTitular").mockResolvedValue(vacio);
      vi.spyOn(api, "fetchVinculos").mockResolvedValue(conTitular);
      montar({ ...contacto, id: "H", name: "Sofía" });
      await userEvent.click(await screen.findByRole("button", { name: "Desvincular" }));
      return put;
    }

    it("abre el modal y no desvincula todavía", async () => {
      const put = await abrir();
      expect(screen.getByText("Desvincular a Sofía")).toBeInTheDocument();
      expect(
        screen.getByText("¿Sofía tiene WhatsApp propio? Cargalo así los avisos y turnos le llegan a Sofía."),
      ).toBeInTheDocument();
      expect(put).not.toHaveBeenCalled();
    });

    it("Guardar y desvincular está deshabilitado con un número inválido y explica por qué", async () => {
      await abrir();
      const guardar = screen.getByRole("button", { name: "Guardar y desvincular" });
      expect(guardar).toBeDisabled();
      await userEvent.type(screen.getByLabelText("WhatsApp propio"), "11 15 3031 7884");
      expect(guardar).toBeDisabled();
      expect(screen.getByText("Este número parece tener 15.")).toBeInTheDocument();
    });

    it("con número válido manda telefonoPropio", async () => {
      const put = await abrir();
      await userEvent.type(screen.getByLabelText("WhatsApp propio"), "1130317884");
      await userEvent.click(screen.getByRole("button", { name: "Guardar y desvincular" }));
      await waitFor(() =>
        expect(put).toHaveBeenCalledWith("H", { holderContactId: null, telefonoPropio: "1130317884" }),
      );
    });

    it("Sin número por ahora manda telefonoPropio null", async () => {
      const put = await abrir();
      await userEvent.click(screen.getByRole("button", { name: "Sin número por ahora" }));
      await waitFor(() => expect(put).toHaveBeenCalledWith("H", { holderContactId: null, telefonoPropio: null }));
    });

    it("Cancelar cierra sin llamar a la API", async () => {
      const put = await abrir();
      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByText("Desvincular a Sofía")).not.toBeInTheDocument();
      expect(put).not.toHaveBeenCalled();
    });

    it("en la lista de la titular también abre el modal de la persona a cargo", async () => {
      const put = vi.spyOn(api, "setTitular").mockResolvedValue(vacio);
      vi.spyOn(api, "fetchVinculos").mockResolvedValue({
        ...vacio,
        aCargo: [{ id: "D", name: "Domingo", relationship: "pareja", relationshipOther: null }],
      });
      montar();
      await userEvent.click(await screen.findByRole("button", { name: "Desvincular" }));
      expect(screen.getByText("Desvincular a Domingo")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Sin número por ahora" }));
      await waitFor(() => expect(put).toHaveBeenCalledWith("D", { holderContactId: null, telefonoPropio: null }));
    });
  });
});
