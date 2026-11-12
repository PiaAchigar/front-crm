import { useState } from "react";
import { PARENTESCOS, type Parentesco } from "../../api/contacts";
import { ETIQUETA_PARENTESCO } from "../contacts/parentescos";
import { useResolverContacto } from "./useInbox";

const field = "rounded border border-surface-highest bg-surface px-2 py-1.5 text-sm";

type Candidato = { id: string; name: string | null };
type Eleccion = { relationship: Parentesco | ""; otro: string };

/** Para un número que comparten varias fichas: elegir cuál es la titular y qué es cada una de las otras. */
export function ResolverContactoModal({
  conversationId,
  candidatos,
  onClose,
  onResolved,
}: {
  conversationId: string;
  candidatos: Candidato[];
  onClose: () => void;
  /** Recibe el id de la conversación que quedó (puede ser otro: si la titular ya tenía una, se fusionan). */
  onResolved: (conversationId: string) => void;
}) {
  const [titularId, setTitularId] = useState<string | null>(null);
  const [elecciones, setElecciones] = useState<Record<string, Eleccion>>({});
  const resolver = useResolverContacto();

  const nombre = (c: Candidato) => c.name ?? "Sin nombre";
  const titular = candidatos.find((c) => c.id === titularId) ?? null;
  const otros = candidatos.filter((c) => c.id !== titularId);
  const eleccion = (id: string): Eleccion => elecciones[id] ?? { relationship: "", otro: "" };
  const cambiar = (id: string, parcial: Partial<Eleccion>) =>
    setElecciones((prev) => ({ ...prev, [id]: { ...eleccion(id), ...parcial } }));

  const completo =
    titular !== null &&
    otros.every((o) => {
      const e = eleccion(o.id);
      return e.relationship !== "" && (e.relationship !== "otro" || e.otro.trim() !== "");
    });

  function guardar() {
    if (!titular || !completo) return;
    resolver.mutate(
      {
        id: conversationId,
        data: {
          titularId: titular.id,
          otros: otros.map((o) => {
            const e = eleccion(o.id);
            const relationship = e.relationship as Parentesco;
            return relationship === "otro"
              ? { contactId: o.id, relationship, relationshipOther: e.otro.trim() }
              : { contactId: o.id, relationship };
          }),
        },
      },
      { onSuccess: (res) => onResolved(res.conversationId) },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-primary">¿Quién es la titular?</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Es la dueña del WhatsApp: la conversación queda en su ficha. Las demás pasan a usar su
          número.
        </p>

        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">Titular</legend>
          {candidatos.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-surface-high">
              <input
                type="radio"
                name="titular"
                checked={titularId === c.id}
                onChange={() => setTitularId(c.id)}
              />
              {nombre(c)}
            </label>
          ))}
        </fieldset>

        {titular && otros.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-surface-high pt-4">
            {otros.map((o) => {
              const e = eleccion(o.id);
              return (
                <div key={o.id} className="flex flex-col gap-1">
                  <label className="flex flex-wrap items-center gap-2 text-sm">
                    <span>
                      {nombre(o)} es
                    </span>
                    <select
                      className={field}
                      aria-label={`${nombre(o)} es`}
                      value={e.relationship}
                      onChange={(ev) => cambiar(o.id, { relationship: ev.target.value as Parentesco | "" })}
                    >
                      <option value="">Elegí…</option>
                      {PARENTESCOS.map((p) => (
                        <option key={p} value={p}>
                          {ETIQUETA_PARENTESCO[p]}
                        </option>
                      ))}
                    </select>
                    <span>de {nombre(titular)}</span>
                  </label>
                  {e.relationship === "otro" && (
                    <label className="text-xs text-ink-soft">
                      ¿Cuál? *
                      <input
                        className={`${field} ml-2`}
                        maxLength={60}
                        value={e.otro}
                        onChange={(ev) => cambiar(o.id, { otro: ev.target.value })}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {resolver.error && (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {(resolver.error as Error).message}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            disabled={!completo || resolver.isPending}
            onClick={guardar}
          >
            {resolver.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
