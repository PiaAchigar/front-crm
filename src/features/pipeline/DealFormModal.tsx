import { useState } from "react";
import { CONTACTS_PAGE_SIZE, useContactsList } from "../contacts/useContacts";

/** Alta manual de un deal en el pipeline (antes de que exista turno o seña).
 *  `registerDeposit` en el backend lo encuentra después por contacto y lo
 *  completa con los datos de la seña en vez de duplicarlo. */
export function DealFormModal({
  onClose,
  onSave,
  saving,
  error,
}: {
  onClose: () => void;
  onSave: (data: { contactId: string; title: string }) => void;
  saving?: boolean;
  error?: string | null;
}) {
  const { data, isLoading } = useContactsList({ limit: CONTACTS_PAGE_SIZE, offset: 0 });
  const contacts = data?.items ?? [];
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">Nuevo deal</h2>
        <div className="flex flex-col gap-3">
          <select
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">
              {isLoading ? "Cargando contactos..." : "Elegí un contacto"}
            </option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.email ?? c.phone ?? c.id}
              </option>
            ))}
          </select>
          <input
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            placeholder="Título del deal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            disabled={!contactId || !title.trim() || saving}
            onClick={() => {
              if (!contactId || !title.trim()) return;
              onSave({ contactId, title: title.trim() });
            }}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
