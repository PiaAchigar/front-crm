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

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sexo: null }));
  });

  // Ronda de arreglos 1: el bug era exactamente que esto no se probaba. Un
  // contacto que YA tiene sexo cargado, al vaciarlo, tiene que mandar
  // `sexo: null` EXPLÍCITO en el body — no `undefined`, que `JSON.stringify`
  // descarta y deja la columna sin tocar en el backend (PATCH silencioso que
  // no limpia nada).
  it("vacía un sexo ya cargado: manda null explícito, no lo omite", async () => {
    const onSave = vi.fn();
    render(
      <ContactFormModal
        contact={{ ...contactoBase, sexo: "hombre" }}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/sexo/i), "");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    const guardado = onSave.mock.calls.at(-1)?.[0];
    expect(guardado).toMatchObject({ sexo: null });
    expect("sexo" in guardado).toBe(true);
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

describe("ContactFormModal — aviso del número", () => {
  const AVISO = /WhatsApp lo necesita así: 549 \+ código de área sin 0 \+ número sin 15\. Ej: 5491130317884\./;

  async function guardarCon(campos: { whatsapp?: string; telefono?: string }) {
    const onSave = vi.fn();
    render(<ContactFormModal contact={{ ...contactoBase }} onClose={() => {}} onSave={onSave} />);
    if (campos.whatsapp) await userEvent.type(screen.getByPlaceholderText("WhatsApp ID"), campos.whatsapp);
    if (campos.telefono) await userEvent.type(screen.getByPlaceholderText("Teléfono"), campos.telefono);
    await userEvent.click(screen.getByRole("button", { name: /^guardar$/i }));
    return onSave;
  }

  it("WhatsApp ID con 15: muestra el aviso y no guarda todavía", async () => {
    const onSave = await guardarCon({ whatsapp: "1530317884" });
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Corregir vuelve al formulario sin guardar", async () => {
    const onSave = await guardarCon({ whatsapp: "1530317884" });
    await userEvent.click(screen.getByRole("button", { name: "Corregir" }));
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("WhatsApp ID")).toHaveValue("1530317884");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("WhatsApp ID inválido: sólo se ofrece Corregir (la API lo rechaza)", async () => {
    await guardarCon({ whatsapp: "1530317884" });
    expect(screen.getByRole("button", { name: "Corregir" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar igual" })).not.toBeInTheDocument();
  });

  it("WhatsApp válido + Teléfono inválido: ofrece Guardar igual y guarda tal cual", async () => {
    const onSave = await guardarCon({ whatsapp: "5491130317884", telefono: "1530317884" });
    await userEvent.click(screen.getByRole("button", { name: "Guardar igual" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ whatsappId: "5491130317884", phone: "1530317884" }),
    );
  });

  it("si el teléfono basura ya estaba cargado y no se toca, no avisa ni reenvía el WhatsApp inválido", async () => {
    const onSave = vi.fn();
    render(
      <ContactFormModal
        contact={{ ...contactoBase, phone: "1530317884", whatsappId: "1530317884" }}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: /^guardar$/i }));
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    const enviado = onSave.mock.calls[0]![0];
    expect(enviado.whatsappId).toBeUndefined();
    expect(enviado.email).toBe("a@b.com");
  });

  it("si el teléfono basura se edita, avisa", async () => {
    const onSave = vi.fn();
    render(
      <ContactFormModal contact={{ ...contactoBase, phone: "1530317884" }} onClose={() => {}} onSave={onSave} />,
    );
    await userEvent.type(screen.getByPlaceholderText("Teléfono"), "5");
    await userEvent.click(screen.getByRole("button", { name: /^guardar$/i }));
    expect(screen.getByText(AVISO)).toBeInTheDocument();
  });

  it("+54 9 11 3031-7884 se guarda normalizado y sin aviso", async () => {
    const onSave = await guardarCon({ whatsapp: "+54 9 11 3031-7884" });
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ whatsappId: "5491130317884" }));
  });

  it("avisa también si el Teléfono trae 15", async () => {
    const onSave = await guardarCon({ telefono: "1530317884" });
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("avisa también si el Teléfono trae 0", async () => {
    const onSave = await guardarCon({ telefono: "01130317884" });
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("sin números cargados no avisa", async () => {
    const onSave = await guardarCon({});
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalled();
  });
});
