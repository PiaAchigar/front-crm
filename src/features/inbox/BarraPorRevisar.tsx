import { useState } from "react";
import { ResolverContactoModal } from "./ResolverContactoModal";

/** Barra del hilo para una conversación que entró por un número compartido sin titular. */
export function BarraPorRevisar({
  porRevisar,
  conversationId,
  candidatos,
  canEdit,
  onResolved,
}: {
  porRevisar: boolean;
  conversationId: string;
  /** El contacto de la conversación + los que comparten su número. */
  candidatos: { id: string; name: string | null }[];
  canEdit: boolean;
  onResolved: (conversationId: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!porRevisar) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <span>
        {candidatos.length >= 2
          ? `Este número lo comparten ${candidatos.length} personas. ¿Quién es la titular?`
          : "Este número puede ser de más de una persona. ¿Quién es la titular?"}
      </span>
      {canEdit && (
        <button
          className="rounded-full bg-primary px-3 py-1 text-xs text-white hover:bg-primary-dark"
          onClick={() => setAbierto(true)}
        >
          Elegir titular
        </button>
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
