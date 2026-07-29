import { useState } from "react";
import type { ChannelType } from "../../api/channels";
import { useContactsList } from "../contacts/useContacts";
import { useCreateConversation } from "./useInbox";

const CHANNELS: { value: ChannelType; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "email", label: "Email" },
];

export function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { data: contacts = [], isLoading } = useContactsList({});
  const create = useCreateConversation();
  const [contactId, setContactId] = useState("");
  const [channel, setChannel] = useState<ChannelType>("whatsapp");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">Nueva conversación</h2>
        <div className="flex flex-col gap-3">
          <select
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">{isLoading ? "Cargando contactos..." : "Elegí un contacto"}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.email ?? c.phone ?? c.id}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={channel}
            onChange={(e) => setChannel(e.target.value as ChannelType)}
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {create.isError && (
            <p className="text-sm text-red-600">{(create.error as Error).message}</p>
          )}
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
            disabled={!contactId || create.isPending}
            onClick={() =>
              create.mutate(
                { contactId, channel },
                { onSuccess: (conv) => onCreated(conv.id) },
              )
            }
          >
            {create.isPending ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
