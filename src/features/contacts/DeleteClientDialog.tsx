import type { Contact } from "../../api/contacts";
import { useArchiveContact, useDeleteClient, useDeleteImpact } from "./useContacts";

/** Muestra qué tiene el cliente y ofrece la única acción posible: borrar si no
 *  tiene historial, archivar si lo tiene. Quien decide es el backend — este
 *  diálogo solo refleja su respuesta. */
export function DeleteClientDialog({
  contact,
  onClose,
}: {
  contact: Contact;
  onClose: () => void;
}) {
  const { data: impact, isLoading } = useDeleteImpact(contact.id);
  const del = useDeleteClient();
  const archive = useArchiveContact();

  const busy = del.isPending || archive.isPending;
  const error = (del.error ?? archive.error) as Error | null;

  const historyParts = impact
    ? [
        [impact.history.invoices, "factura(s)"],
        [impact.history.payments, "pago(s)"],
        [impact.history.appointments, "turno(s)"],
        [impact.history.subscriptions, "suscripción(es)"],
        [impact.history.enrollments, "inscripción(es)"],
      ]
        .filter(([n]) => (n as number) > 0)
        .map(([n, label]) => `${n} ${label}`)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-5">
        <h2 className="mb-3 text-lg font-semibold text-ink">Eliminar cliente</h2>

        {isLoading || !impact ? (
          <p className="text-sm text-ink-soft">Revisando el historial…</p>
        ) : impact.blocked ? (
          <div className="space-y-2 text-sm">
            <p className="text-ink">
              <strong>{contact.name}</strong> tiene {historyParts.join(", ")}.
            </p>
            <p className="text-ink-soft">
              No se puede eliminar sin perder el historial fiscal. Se va a archivar:
              sale de la lista y no se puede volver a usar, pero el historial queda intacto.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-ink">
              <strong>{contact.name}</strong> no tiene facturas, pagos, turnos ni suscripciones.
            </p>
            <p className="text-ink-soft">
              Se va a eliminar definitivamente. Esta acción no se puede deshacer.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error.message}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          {impact && !impact.blocked && (
            <button
              className="rounded-full bg-red-700 px-4 py-1.5 text-sm text-white disabled:opacity-40"
              disabled={busy}
              onClick={() => del.mutate(contact.id, { onSuccess: onClose })}
            >
              {del.isPending ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          )}
          {impact && impact.blocked && (
            <button
              className="rounded-full bg-primary px-4 py-1.5 text-sm text-white disabled:opacity-40"
              disabled={busy}
              onClick={() => archive.mutate(contact.id, { onSuccess: onClose })}
            >
              {archive.isPending ? "Archivando…" : "Archivar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
