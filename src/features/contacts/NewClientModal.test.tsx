import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/contacts";
import { NewClientModal } from "./NewClientModal";

describe("NewClientModal — aviso del número", () => {
  afterEach(() => vi.restoreAllMocks());

  async function completar(telefono: string) {
    const create = vi.spyOn(api, "createClient").mockResolvedValue({} as api.CustomerSummary);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <NewClientModal onClose={() => {}} />
      </QueryClientProvider>,
    );
    const campos = screen.getAllByRole("textbox");
    await userEvent.type(campos[0]!, "Ana Pérez");
    await userEvent.type(campos[1]!, "12345678");
    await userEvent.type(campos[2]!, telefono);
    await userEvent.click(screen.getByRole("button", { name: "Crear cliente" }));
    return create;
  }

  it("teléfono con 15: avisa y no crea hasta confirmar", async () => {
    const create = await completar("1530317884");
    expect(screen.getByText(/WhatsApp lo necesita así/)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Guardar igual" }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ phone: "1530317884" }));
  });

  it("teléfono bueno: crea sin aviso", async () => {
    const create = await completar("11 3031-7884");
    expect(screen.queryByText(/WhatsApp lo necesita así/)).not.toBeInTheDocument();
    expect(create).toHaveBeenCalled();
  });
});
