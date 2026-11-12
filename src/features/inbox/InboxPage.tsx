import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  avisarConversacionAbierta,
  escucharEstadoAvisos,
  isEmbedded,
  pedirSilenciarAvisos,
} from "../../lib/embed";
import { can } from "../../lib/permissions";
import { useCrmSession } from "../../lib/session";
import { ConversationList } from "./ConversationList";
import { ConversationThread } from "./ConversationThread";
import { NewConversationModal } from "./NewConversationModal";

export function InboxPage() {
  const { role } = useCrmSession();
  const canEdit = can(role, "crm", "edit");
  // El dashboard abre el Inbox en una conversación con `?conversacion=<id>`
  // (al tocar un aviso de mensaje nuevo).
  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get("conversacion"),
  );
  const [creating, setCreating] = useState(false);
  const [silenciado, setSilenciado] = useState(false);

  useEffect(() => escucharEstadoAvisos(setSilenciado), []);

  // El dashboard no avisa de la conversación que se está mirando.
  useEffect(() => {
    avisarConversacionAbierta(selectedId);
  }, [selectedId]);
  useEffect(() => () => avisarConversacionAbierta(null), []);

  return (
    <div className="flex h-full flex-col gap-3">
      {isEmbedded && (
        <div className="flex justify-end">
          <button
            className="rounded-full border border-surface-highest px-3 py-1 text-xs hover:bg-surface-high"
            onClick={() => pedirSilenciarAvisos(!silenciado)}
          >
            {silenciado
              ? "🔕 Activar notificaciones"
              : "🔔 Silenciar notificaciones"}
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-80 shrink-0 flex-col">
          <ConversationList
            selectedId={selectedId}
            onSelect={setSelectedId}
            canEdit={canEdit}
            onNew={() => setCreating(true)}
          />
        </div>
        <div className="min-w-0 flex-1">
          {selectedId ? (
            <ConversationThread
              conversationId={selectedId}
              canEdit={canEdit}
              onResolved={setSelectedId}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-surface-highest bg-surface-low text-sm text-ink-soft">
              Elegí una conversación para ver el hilo.
            </div>
          )}
        </div>
        {creating && (
          <NewConversationModal
            onClose={() => setCreating(false)}
            onCreated={(id) => {
              setSelectedId(id);
              setCreating(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
