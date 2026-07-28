import { useState } from "react";
import type { Contact, ContactInput } from "../../api/contacts";

export function ContactFormModal({
  contact,
  onClose,
  onSave,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSave: (data: ContactInput) => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [status, setStatus] = useState<ContactInput["status"]>(
    (contact?.status as ContactInput["status"]) ?? "prospect",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">
          {contact ? "Editar contacto" : "Nuevo contacto"}
        </h2>
        <div className="flex flex-col gap-3">
          <input
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContactInput["status"])}
          >
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
            onClick={() => {
              if (!name.trim()) return;
              // `email`/`phone` son opcionales en el backend, pero un string
              // vacío NO es `undefined` para Zod: `z.string().email().optional()`
              // rechaza "" con un 400. Se mandan como `undefined` para que
              // queden fuera del JSON.
              onSave({
                name: name.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                status,
              });
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
