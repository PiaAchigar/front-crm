import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponderFueraDelInbox } from "./ResponderFueraDelInbox";

describe("ResponderFueraDelInbox — consultas del formulario de la web", () => {
  it("explica por qué no se responde acá y ofrece WhatsApp y mail", () => {
    render(<ResponderFueraDelInbox telefono="11 5555-0001" email="ana@ejemplo.com" />);
    expect(screen.getByText(/llegó por el formulario de la web/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /responder por whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/5491155550001",
    );
    expect(screen.getByRole("link", { name: /responder por mail/i })).toHaveAttribute(
      "href",
      "mailto:ana@ejemplo.com",
    );
  });

  it("sin un teléfono que sirva, sólo mail", () => {
    render(<ResponderFueraDelInbox telefono="123" email="ana@ejemplo.com" />);
    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
    expect(screen.getByRole("link", { name: /responder por mail/i })).toBeInTheDocument();
  });
});
