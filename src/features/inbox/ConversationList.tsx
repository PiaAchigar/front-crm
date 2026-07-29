import { useState } from "react";
import type { Conversation } from "../../api/inbox";
import { CHANNEL_META } from "../channels/channels.config";
import { useConversationsList } from "./useInbox";

const CHANNEL_OPTIONS = [
  { value: "", label: "Todos los canales" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "email", label: "Email" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "open", label: "Abiertas" },
  { value: "closed", label: "Cerradas" },
];

export function ConversationList({
  selectedId,
  onSelect,
  canEdit,
  onNew,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  canEdit: boolean;
  onNew: () => void;
}) {
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data: conversations = [], isLoading, isError } = useConversationsList({
    channel,
    status,
    q,
  });

  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-surface-highest bg-surface-low p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversaciones</h2>
        {canEdit && (
          <button
            className="rounded-full bg-primary px-3 py-1 text-sm text-white hover:bg-primary-dark"
            onClick={onNew}
          >
            + Nueva
          </button>
        )}
      </div>
      <input
        className="rounded border border-surface-highest bg-surface px-3 py-1.5 text-sm"
        placeholder="Buscar por contacto..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="flex gap-2">
        <select
          className="min-w-0 flex-1 rounded border border-surface-highest bg-surface px-2 py-1.5 text-xs"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          {CHANNEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="min-w-0 flex-1 rounded border border-surface-highest bg-surface px-2 py-1.5 text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <p className="p-2 text-sm text-ink-soft">Cargando…</p>}
        {isError && (
          <p className="p-2 text-sm text-red-600">No pudimos cargar las conversaciones.</p>
        )}
        {!isLoading && !isError && conversations.length === 0 && (
          <p className="p-2 text-sm text-ink-soft">No hay conversaciones.</p>
        )}
        <ul className="flex flex-col gap-1">
          {conversations.map((c: Conversation) => {
            const meta = c.channel ? CHANNEL_META[c.channel] : null;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className={`w-full rounded-lg p-2 text-left text-sm ${
                    selectedId === c.id ? "bg-surface-high" : "hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {meta ? `${meta.icon} ` : ""}
                      {c.contactName ?? "Sin contacto"}
                    </span>
                    {c.status === "closed" && (
                      <span className="shrink-0 rounded-full bg-surface-high px-2 py-0.5 text-[10px] text-ink-soft">
                        cerrada
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-soft">
                    {c.lastMessagePreview ?? "Sin mensajes"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
