import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgents } from "../../api/deals";
import { CHANNEL_META } from "../channels/channels.config";
import { useConversation, useSendMessage, useUpdateConversation } from "./useInbox";

export function ConversationThread({
  conversationId,
  canEdit,
}: {
  conversationId: string;
  canEdit: boolean;
}) {
  const { data, isLoading, isError } = useConversation(conversationId);
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const send = useSendMessage();
  const update = useUpdateConversation();
  const [draft, setDraft] = useState("");

  if (isLoading) return <div className="p-4 text-sm text-ink-soft">Cargando hilo…</div>;
  if (isError || !data)
    return <div className="p-4 text-sm text-red-600">No pudimos cargar la conversación.</div>;

  const { conversation, messages } = data;
  const meta = conversation.channel ? CHANNEL_META[conversation.channel] : null;

  function submit() {
    if (send.isPending) return;
    const content = draft.trim();
    if (!content) return;
    send.mutate({ id: conversationId, content }, { onSuccess: () => setDraft("") });
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-surface-highest bg-surface-low">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-high p-3">
        <div>
          <h2 className="font-semibold">
            {meta ? `${meta.icon} ` : ""}
            {conversation.contactName ?? "Sin contacto"}
          </h2>
          <p className="text-xs text-ink-soft">{meta?.label ?? conversation.channel}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <select
              className="rounded border border-surface-highest bg-surface px-2 py-1 text-xs"
              value={conversation.assignedAgentId ?? ""}
              onChange={(e) =>
                update.mutate({
                  id: conversationId,
                  data: { assignedAgentId: e.target.value || null },
                })
              }
            >
              <option value="">Sin asignar</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName ?? a.email}
                </option>
              ))}
            </select>
            <button
              className="rounded-full border border-surface-highest px-3 py-1 text-xs hover:bg-surface-high"
              onClick={() =>
                update.mutate({
                  id: conversationId,
                  data: { status: conversation.status === "closed" ? "open" : "closed" },
                })
              }
            >
              {conversation.status === "closed" ? "Reabrir" : "Cerrar"}
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-sm text-ink-soft">Todavía no hay mensajes en este hilo.</p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.senderType === "agent";
            return (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "self-end bg-primary text-white" : "self-start bg-surface-high text-ink"
                }`}
              >
                {m.content}
                {m.mediaUrl && (
                  <a
                    href={m.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs underline"
                  >
                    Ver adjunto
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {canEdit && (
        <div className="border-t border-surface-high p-3">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              placeholder="Escribí un mensaje…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <button
              className="rounded-full bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
              disabled={send.isPending || !draft.trim()}
              onClick={submit}
            >
              {send.isPending ? "..." : "Enviar"}
            </button>
          </div>
          {send.isError && (
            <p className="mt-1 text-xs text-red-600">{(send.error as Error).message}</p>
          )}
          <p className="mt-1 text-[11px] text-ink-soft">
            Se guarda en el historial. El envío real por el canal se habilita en una fase posterior.
          </p>
        </div>
      )}
    </div>
  );
}
