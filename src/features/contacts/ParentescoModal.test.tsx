import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ParentescoModal } from "./ParentescoModal";

describe("ParentescoModal", () => {
  it("ofrece los seis parentescos con su etiqueta", () => {
    render(<ParentescoModal titulo="t" onConfirm={() => {}} onClose={() => {}} />);
    const opciones = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opciones).toEqual(["Elegí…", "Pareja", "Hijo", "Hija", "Nieto", "Nieta", "Otro"]);
  });

  it("no deja guardar sin elegir", () => {
    render(<ParentescoModal titulo="t" onConfirm={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("manda el parentesco elegido", async () => {
    const onConfirm = vi.fn();
    render(<ParentescoModal titulo="t" onConfirm={onConfirm} onClose={() => {}} />);
    await userEvent.selectOptions(screen.getByLabelText(/parentesco/i), "hija");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onConfirm).toHaveBeenCalledWith({ relationship: "hija" });
  });

  it("con Otro exige el texto y lo manda como relationshipOther", async () => {
    const onConfirm = vi.fn();
    render(<ParentescoModal titulo="t" onConfirm={onConfirm} onClose={() => {}} />);
    await userEvent.selectOptions(screen.getByLabelText(/parentesco/i), "otro");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/cuál/i), "  vecina ");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onConfirm).toHaveBeenCalledWith({ relationship: "otro", relationshipOther: "vecina" });
  });
});
