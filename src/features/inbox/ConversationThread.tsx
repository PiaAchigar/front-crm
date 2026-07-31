import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgents } from "../../api/deals";
import { fetchMessagesAfter, fetchMessagesBefore, type Message } from "../../api/inbox";
import { CHANNEL_META } from "../channels/channels.config";
import { useConversation, useSendMessage, useUpdateConversation } from "./useInbox";
import { useSimulateInbound } from "../automation/useAutomations";
import { can } from "../../lib/permissions";
import { useCrmSession } from "../../lib/session";

const POLL_INTERVAL_MS = 5000;
const LOAD_OLDER_THRESHOLD_PX = 100;

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
  const simulate = useSimulateInbound();
  const { role } = useCrmSession();
  const canManage = can(role, "crm", "manage");
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const seededConversationId = useRef<string | null>(null);
  const scrolledOnMount = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [newestCursor, setNewestCursor] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Reinicia el estado local al cambiar de conversación, para no mostrar
  // mensajes de la anterior mientras carga la nueva.
  useEffect(() => {
    seededConversationId.current = null;
    setMessages([]);
    setOldestCursor(null);
    setNewestCursor(null);
    setHasMoreOlder(false);
  }, [conversationId]);

  // Siembra el estado local desde la carga inicial de la conversación. Solo
  // una vez por conversación — de ahí en más el estado local es la fuente
  // de verdad (cargar-anteriores, polling y envío lo mutan directo).
  useEffect(() => {
    if (!data || seededConversationId.current === conversationId) return;
    seededConversationId.current = conversationId;
    setMessages(data.messages);
    setOldestCursor(data.oldestCursor);
    setNewestCursor(data.newestCursor);
    setHasMoreOlder(data.hasMoreOlder);
  }, [data, conversationId]);

  // Scroll al fondo la primera vez que la conversación trae mensajes.
  useEffect(() => {
    if (messages.length === 0 || scrolledOnMount.current === conversationId) return;
    scrolledOnMount.current = conversationId;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversationId, messages]);

  // Polling: mientras el hilo está montado, pregunta cada 5s si hay
  // mensajes nuevos desde el último cursor conocido (mensajes del cliente
  // vía webhook, que no disparan ninguna invalidación de React Query).
  useEffect(() => {
    const interval = setInterval(async () => {
      const page = await fetchMessagesAfter(conversationId, newestCursor);
      if (page.messages.length === 0) return;
      setMessages((prev) => {
        const knownIds = new Set(prev.map((m) => m.id));
        const fresh = page.messages.filter((m) => !knownIds.has(m.id));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      setNewestCursor(page.newestCursor);
      // requestAnimationFrame: hay que esperar a que React pinte los
      // mensajes nuevos en el DOM antes de leer scrollHeight — si no, se
      // lee el alto viejo (mismo motivo que en loadOlder más abajo).
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId, newestCursor]);

  async function loadOlder() {
    if (!hasMoreOlder || loadingOlder || !oldestCursor) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    try {
      const page = await fetchMessagesBefore(conversationId, oldestCursor);
      setMessages((prev) => [...page.messages, ...prev]);
      setOldestCursor(page.oldestCursor);
      setHasMoreOlder(page.hasMoreOlder);
      requestAnimationFrame(() => {
        if (el) el.scrollTop += el.scrollHeight - prevScrollHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (el && el.scrollTop < LOAD_OLDER_THRESHOLD_PX) loadOlder();
  }

  if (isLoading) return <div className="p-4 text-sm text-ink-soft">Cargando hilo…</div>;
  if (isError || !data)
    return <div className="p-4 text-sm text-red-600">No pudimos cargar la conversación.</div>;

  const { conversation } = data;
  const meta = conversation.channel ? CHANNEL_META[conversation.channel] : null;

  function submit() {
    if (send.isPending) return;
    const content = draft.trim();
    if (!content) return;
    send.mutate(
      { id: conversationId, content },
      {
        onSuccess: (msg) => {
          setDraft("");
          setMessages((prev) => [...prev, msg]);
          setNewestCursor(`${msg.createdAt}_${msg.id}`);
          requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          });
        },
      },
    );
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
            {canManage && (
              <button
                className="rounded-full border border-surface-highest px-3 py-1 text-xs hover:bg-surface-high"
                disabled={simulate.isPending}
                onClick={() => {
                  const text = window.prompt("Simular mensaje entrante del cliente:");
                  if (text && text.trim()) {
                    simulate.mutate({ conversationId, content: text.trim() });
                  }
                }}
              >
                Simular entrante
              </button>
            )}
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

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto p-3"
      >
        {loadingOlder && (
          <p className="pb-2 text-center text-xs text-ink-soft">Cargando mensajes anteriores…</p>
        )}
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
            Se envía por el canal de la conversación (ej. WhatsApp) y queda guardado en el
            historial.
          </p>
        </div>
      )}
    </div>
  );
}
