import { useState } from "react";
import { UnirContactoModal } from "../contacts/UnirContactoModal";
import { ResolverContactoModal } from "./ResolverContactoModal";
import { useResolverContacto } from "./useInbox";

/** Barra del hilo para una conversación que entró por un número compartido sin titular. */
export function BarraPorRevisar({
  porRevisar,
  conversationId,
  contactId,
  candidatos,
  canEdit,
  onResolved,
}: {
  porRevisar: boolean;
  conversationId: string;
  /** El contacto de la conversación: la ficha que se queda si se unen. */
  contactId: string;
  /** El contacto de la conversación + los que comparten su número. */
  candidatos: { id: string; name: string | null }[];
  canEdit: boolean;
  onResolved: (conversationId: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [uniendo, setUniendo] = useState(false);
  const resolver = useResolverContacto();
  if (!porRevisar) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <span>
        {`Hay ${candidatos.length} fichas con este número. ¿Son la misma persona o distintas?`}
      </span>
      {canEdit && (
        <div className="flex gap-2">
          <button
            className="rounded-full border border-primary px-3 py-1 text-xs text-primary hover:bg-surface-high"
            onClick={() => setUniendo(true)}
          >
            Es la misma → Unir
          </button>
          <button
            className="rounded-full bg-primary px-3 py-1 text-xs text-white hover:bg-primary-dark"
            onClick={() => setAbierto(true)}
          >
            Son distintas → Elegir titular
          </button>
        </div>
      )}
      {uniendo && (
        <UnirContactoModal
          contact={candidatos.find((c) => c.id === contactId) ?? { id: contactId, name: null }}
          candidatos={candidatos}
          onClose={() => setUniendo(false)}
          onUnido={() => {
            // Si con esta unión queda una sola ficha, ya no hay nada que revisar.
            if (candidatos.length - 1 === 1) {
              resolver.mutate(
                { id: conversationId, data: { titularId: contactId, otros: [] } },
                { onSuccess: (res) => onResolved(res.conversationId) },
              );
            }
          }}
        />
      )}
      {abierto && (
        <ResolverContactoModal
          conversationId={conversationId}
          candidatos={candidatos}
          onClose={() => setAbierto(false)}
          onResolved={(id) => {
            setAbierto(false);
            onResolved(id);
          }}
        />
      )}
    </div>
  );
}
