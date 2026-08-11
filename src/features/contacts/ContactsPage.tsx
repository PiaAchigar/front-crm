import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Contact, ContactInput } from "../../api/contacts";
import { CONTACTS_PAGE_SIZE, useContactsList, useUpdateContact } from "./useContacts";
import { NewClientModal } from "./NewClientModal";
import { ContactFormModal } from "./ContactFormModal";

export function ContactsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Contact | null>(null);
  const update = useUpdateContact();

  const { data, isLoading } = useContactsList({
    q,
    includeArchived,
    limit: CONTACTS_PAGE_SIZE,
    offset: page * CONTACTS_PAGE_SIZE,
  });
  const contacts = data?.items ?? [];
  const total = data?.total ?? 0;

  // Volver a la página 1 cuando cambia el filtro, o quedaría en una página que ya no existe.
  useEffect(() => {
    setPage(0);
  }, [q, includeArchived]);

  function handleUpdate(data: ContactInput) {
    if (!editing) return;
    update.mutate({ id: editing.id, data }, { onSuccess: () => setEditing(null) });
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
          + Nuevo Cliente
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
              <th className="py-2 text-right">Acciones</th>
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
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded px-2 py-1 text-xs text-ink-soft hover:bg-surface-highest"
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(c);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      title="Eliminar"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-ink-soft">
          <span>
            Mostrando {page * CONTACTS_PAGE_SIZE + 1}–
            {Math.min((page + 1) * CONTACTS_PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded border border-surface-highest px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Anterior
            </button>
            <button
              className="rounded border border-surface-highest px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * CONTACTS_PAGE_SIZE >= total}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {creating && <NewClientModal onClose={() => setCreating(false)} />}
      {editing && (
        <ContactFormModal
          contact={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
}
