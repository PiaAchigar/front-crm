import { useState } from "react";
import { can } from "../../lib/permissions";
import { useCrmSession } from "../../lib/session";
import { ConversationList } from "./ConversationList";
import { ConversationThread } from "./ConversationThread";
import { NewConversationModal } from "./NewConversationModal";

export function InboxPage() {
  const { role } = useCrmSession();
  const canEdit = can(role, "crm", "edit");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex h-full gap-4">
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
          <ConversationThread conversationId={selectedId} canEdit={canEdit} />
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
  );
}
