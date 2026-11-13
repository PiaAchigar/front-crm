import { useNavigate } from "react-router-dom";
import { formatHoyOFecha } from "../../lib/format";
import { metaDeCanal } from "../inbox/canal";
import { useConversacionesDeContacto } from "./useContacts";

export function ConversacionesSection({ contactId }: { contactId: string }) {
  const { data } = useConversacionesDeContacto(contactId);
  const navigate = useNavigate();

  return (
    <section className="rounded-xl border border-surface-high bg-surface-low p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Conversaciones
      </h2>

      {data && data.length === 0 && <p className="text-sm text-ink-soft">Sin conversaciones.</p>}

      <ul className="flex flex-col gap-3 text-sm">
        {data?.map((c) => {
          const meta = metaDeCanal(c.channel);
          const canal = meta?.label ?? c.channel ?? "Canal";
          const um = c.ultimoMensaje;
          return (
            <li key={c.id}>
              <div className="flex items-center gap-2">
                <span aria-hidden>{meta?.icon ?? "💬"}</span>
                <span className="font-medium">{canal}</span>
                {um?.content && <span className="min-w-0 flex-1 truncate text-ink-soft">“{um.content}”</span>}
                {!um?.content && <span className="flex-1" />}
                {um && <span className="shrink-0 text-xs text-ink-soft">{formatHoyOFecha(um.createdAt)}</span>}
                <span className="shrink-0 text-xs text-ink-soft">{c.cantidadMensajes} msj</span>
                <button
                  className="shrink-0 text-xs text-primary hover:underline"
                  onClick={() => navigate(`/inbox?conversacion=${c.id}`)}
                >
                  Abrir
                </button>
              </div>
              {c.via && (
                <p className="mt-0.5 text-xs text-ink-soft">
                  por el {c.channel === "whatsapp" ? "WhatsApp" : canal} de {c.via.titularName ?? "Sin nombre"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
