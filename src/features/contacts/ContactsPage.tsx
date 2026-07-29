import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ContactInput } from "../../api/contacts";
import { useContactsList, useCreateContact } from "./useContacts";
import { ContactFormModal } from "./ContactFormModal";

export function ContactsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: contacts = [], isLoading } = useContactsList({
    status: status || undefined,
    q,
    includeArchived,
  });
  const create = useCreateContact();

  function handleSave(data: ContactInput) {
    create.mutate(data, { onSuccess: () => setCreating(false) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          <label className="flex items-center gap-1.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Mostrar archivados
          </label>
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
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-t border-surface-high hover:bg-surface-high"
                onClick={() => navigate(`/contactos/${c.id}`)}
              >
                <td className="py-2">{c.name}{c.isArchived ? " (archivado)" : ""}</td>
                <td className="py-2">{c.phone}</td>
                <td className="py-2">{c.email}</td>
                <td className="py-2">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {creating && (
        <ContactFormModal
          contact={null}
          onClose={() => setCreating(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
