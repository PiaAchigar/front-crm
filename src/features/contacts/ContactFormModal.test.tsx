import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Contact } from "../../api/contacts";
import { ContactFormModal } from "./ContactFormModal";

/**
 * El brief de la Task 8 nombraba `ContactForm.tsx` con un componente
 * autosuficiente (`<ContactForm contactId="c1" />` que se guarda solo). El
 * componente real es `ContactFormModal`: recibe `contact` y `onSave` como
 * props, y quien lo monta (`ContactDetailPage`) es quien pega el PATCH. Estos
 * tests están escritos contra el componente real.
 */

const contactoBase: Contact = {
  id: "c1",
  name: "Ana Pérez",
  email: null,
  phone: null,
  status: "customer",
  whatsappId: null,
  instagramId: null,
  facebookId: null,
  birthdate: null,
  tags: null,
  preferredService: null,
  address: null,
  city: null,
  postalCode: null,
  country: null,
  notes: null,
  isArchived: false,
  sexo: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("ContactFormModal — sexo", () => {
  it("guarda el sexo de la clienta", async () => {
    const onSave = vi.fn();
    render(<ContactFormModal contact={contactoBase} onClose={() => {}} onSave={onSave} />);

    await userEvent.selectOptions(screen.getByLabelText(/sexo/i), "hombre");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sexo: "hombre" }));
  });

  it("permite dejarlo vacío: sin cargar, se calcula como mujer", async () => {
    const onSave = vi.fn();
    render(<ContactFormModal contact={null} onClose={() => {}} onSave={onSave} />);

    await userEvent.type(screen.getByPlaceholderText(/^nombre/i), "Clienta Nueva");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sexo: undefined }));
  });

  it("precarga el sexo que ya tenía el contacto", async () => {
    const onSave = vi.fn();
    render(
      <ContactFormModal
        contact={{ ...contactoBase, sexo: "hombre" }}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    expect(screen.getByLabelText(/sexo/i)).toHaveValue("hombre");
  });
});
