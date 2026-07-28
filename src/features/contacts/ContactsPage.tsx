import { useState } from "react";
import type { Contact, ContactInput } from "../../api/contacts";
import { useContactsList, useCreateContact, useUpdateContact } from "./useContacts";
import { ContactFormModal } from "./ContactFormModal";

export function ContactsPage() {
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: contacts = [], isLoading } = useContactsList({ status: status || undefined, q });
  const create = useCreateContact();
  const update = useUpdateContact();

  function handleSave(data: ContactInput) {
    if (editing) {
      update.mutate({ id: editing.id, data }, { onSuccess: () => setEditing(null) });
    } else {
      create.mutate(data, { onSuccess: () => setCreating(false) });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <input
            className="rounded border border-surface-highest bg-surface-low px-3 py-1.5 text-sm"
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded border border-surface-highest bg-surface-low px-3 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
          onClick={() => setCreating(true)}
        >
          + Nuevo contacto
        </button>
      </div>

      {isLoading ? (
        <p className="text-ink-soft">Cargando...</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-2">Nombre</th>
              <th className="py-2">Teléfono</th>
              <th className="py-2">Email</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-surface-high">
                <td className="py-2">{c.name}</td>
                <td className="py-2">{c.phone}</td>
                <td className="py-2">{c.email}</td>
                <td className="py-2">{c.status}</td>
                <td className="py-2 text-right">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setEditing(c)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(creating || editing) && (
        <ContactFormModal
          contact={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
