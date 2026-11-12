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
    expect(screen.getByText(/Pareja:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Domingo" })).toHaveAttribute("href", "/contactos/D");
  });

  it("a cargo: muestra de quién usa el WhatsApp y el parentesco", async () => {
    vi.spyOn(api, "fetchVinculos").mockResolvedValue({
      ...vacio,
      titular: { id: "T", name: "Andrea", relationship: "hija", relationshipOther: null },
    });
    montar({ ...contacto, id: "H", name: "Sofía" });
    const p = (await screen.findByText(/Usa el WhatsApp de/)).closest("p")!;
    expect(p).toHaveTextContent("Usa el WhatsApp de Andrea (Hija)");
    expect(screen.getByRole("link", { name: "Andrea" })).toHaveAttribute("href", "/contactos/T");
  });

  it("'otro' muestra el texto aclarado", async () => {
    vi.spyOn(api, "fetchVinculos").mockResolvedValue({
      ...vacio,
      aCargo: [{ id: "V", name: "Marta", relationship: "otro", relationshipOther: "vecina" }],
    });
    montar();
    expect(await screen.findByText(/vecina:/)).toBeInTheDocument();
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
        conversaciones: 1, turnos: 3, pagos: 0, facturas: 0, compras: 0, aCargo: 0,
      });
      const unir = vi.spyOn(api, "unirContactos").mockResolvedValue({ id: "A" });
      await hastaElPreview();
      expect(
        await screen.findByText("Se pasan 3 turnos y 1 conversación de Andrea P. a Andrea. Andrea P. se borra."),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Unir fichas" }));
      await waitFor(() => expect(unir).toHaveBeenCalledWith("A", "B"));
    });

    it("409: avisa que tienen DNI o CUIT distintos", async () => {
      preparar();
      vi.spyOn(api, "fetchUnionPreview").mockResolvedValue({
        conversaciones: 0, turnos: 0, pagos: 0, facturas: 0, compras: 0, aCargo: 0,
      });
      vi.spyOn(api, "unirContactos").mockRejectedValue(new ApiError(409, "DNI distinto"));
      await hastaElPreview();
      await userEvent.click(await screen.findByRole("button", { name: "Unir fichas" }));
      expect(
        await screen.findByText("No se pueden unir: tienen DNI o CUIT distintos"),
      ).toBeInTheDocument();
    });
  });
});
