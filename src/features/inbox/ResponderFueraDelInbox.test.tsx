import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponderFueraDelInbox } from "./ResponderFueraDelInbox";

describe("ResponderFueraDelInbox — consultas del formulario de la web", () => {
  it("explica por qué no se responde acá y ofrece WhatsApp y mail", () => {
    render(
      <ResponderFueraDelInbox
        telefono="11 5555-0001"
        email="ana@ejemplo.com"
        nombre="Ana"
        consulta="Hola"
      />,
    );
    expect(screen.getByText(/llegó por el formulario de la web/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /responder por whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/5491155550001",
    );
    const mail = new URL(
      screen.getByRole("link", { name: /responder por mail/i }).getAttribute("href")!,
    );
    expect(mail.origin + mail.pathname).toBe("https://mail.google.com/mail/");
    expect(mail.searchParams.get("to")).toBe("ana@ejemplo.com");
  });

  it("si el teléfono no se entiende, lo muestra igual para copiarlo", () => {
    render(
      <ResponderFueraDelInbox telefono="123" email="ana@ejemplo.com" nombre="Ana" consulta="Hola" />,
    );
    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
    expect(screen.getByText(/123/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /responder por mail/i })).toBeInTheDocument();
  });
});
