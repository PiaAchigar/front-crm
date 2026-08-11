import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Contact, ContactInput, ContactSort } from "../../api/contacts";
import { can } from "../../lib/permissions";
import { useCrmSession } from "../../lib/session";
import {
  CONTACTS_PAGE_SIZE,
  useContactsList,
  useUnarchiveContact,
  useUpdateContact,
} from "./useContacts";
import { NewClientModal } from "./NewClientModal";
import { ContactFormModal } from "./ContactFormModal";
import { DeleteClientDialog } from "./DeleteClientDialog";

export function ContactsPage() {
  const navigate = useNavigate();
  const { role } = useCrmSession();
  const canDelete = can(role, "crm", "manage");
  const [q, setQ] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sort, setSort] = useState<ContactSort>("recent");
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const update = useUpdateContact();
  const unarchive = useUnarchiveContact();

  const { data, isLoading } = useContactsList({
    q,
    includeArchived,
    sort,
    limit: CONTACTS_PAGE_SIZE,
    offset: page * CONTACTS_PAGE_SIZE,
  });
  const contacts = data?.items ?? [];
  const total = data?.total ?? 0;

  // Volver a la página 1 cuando cambia el filtro o el orden, o quedaría en una
  // página que ya no existe — o peor, en la página 40 de una lista recién dada
  // vuelta, mirando cualquier cosa.
  useEffect(() => {
    setPage(0);
  }, [q, includeArchived, sort]);

  // A→Z, Z→A y de vuelta al orden por fecha de alta.
  function toggleNameSort() {
    setSort((s) => (s === "nameAsc" ? "nameDesc" : s === "nameDesc" ? "recent" : "nameAsc"));
  }
  const sortArrow = sort === "nameAsc" ? "▲" : sort === "nameDesc" ? "▼" : "";

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
              <th className="py-2">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-high hover:text-ink"
                  onClick={toggleNameSort}
                  title={
                    sort === "nameAsc"
                      ? "Ordenado A→Z. Clickeá para Z→A"
                      : sort === "nameDesc"
                        ? "Ordenado Z→A. Clickeá para volver al orden por fecha de alta"
                        : "Ordenado por fecha de alta. Clickeá para ordenar A→Z"
                  }
                >
                  Nombre
                  <span className="text-[10px]">{sortArrow}</span>
                </button>
              </th>
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
                    {c.isArchived && (
                      <button
                        className="rounded px-2 py-1 text-xs text-ink-soft hover:bg-surface-highest disabled:opacity-40"
                        title="Desarchivar"
                        disabled={unarchive.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          unarchive.mutate(c.id);
                        }}
                      >
                        Desarchivar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(c);
                        }}
                      >
                        Eliminar
                      </button>
                    )}
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
      {deleting && (
        <DeleteClientDialog contact={deleting} onClose={() => setDeleting(null)} />
      )}
    </div>
  );
}
