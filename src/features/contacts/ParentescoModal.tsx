import { useState } from "react";
import { PARENTESCOS, type Parentesco } from "../../api/contacts";
import { ETIQUETA_PARENTESCO } from "./parentescos";

const field = "rounded border border-surface-highest bg-surface px-3 py-2 text-sm";

export type ParentescoElegido = { relationship: Parentesco; relationshipOther?: string };

/** Pregunta qué es una persona de otra. Con "Otro" pide aclararlo. */
export function ParentescoModal({
  titulo,
  onConfirm,
  onClose,
  isPending = false,
  error = null,
}: {
  titulo: string;
  onConfirm: (elegido: ParentescoElegido) => void;
  onClose: () => void;
  isPending?: boolean;
  error?: string | null;
}) {
  const [relationship, setRelationship] = useState<Parentesco | "">("");
  const [otro, setOtro] = useState("");

  const faltaAclarar = relationship === "otro" && !otro.trim();
  const puedeConfirmar = relationship !== "" && !faltaAclarar && !isPending;

  function confirmar() {
    if (relationship === "" || faltaAclarar) return;
    onConfirm(
      relationship === "otro"
        ? { relationship, relationshipOther: otro.trim() }
        : { relationship },
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-primary">{titulo}</h2>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-ink-soft">
            Parentesco
            <select
              className={`${field} mt-1 w-full`}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as Parentesco | "")}
            >
              <option value="">Elegí…</option>
              {PARENTESCOS.map((p) => (
                <option key={p} value={p}>
                  {ETIQUETA_PARENTESCO[p]}
                </option>
              ))}
            </select>
          </label>
          {relationship === "otro" && (
            <label className="text-xs text-ink-soft">
              ¿Cuál? *
              <input
                className={`${field} mt-1 w-full`}
                maxLength={60}
                placeholder="Ej: vecina, hermana, amiga"
                value={otro}
                onChange={(e) => setOtro(e.target.value)}
              />
            </label>
          )}
        </div>
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            disabled={!puedeConfirmar}
            onClick={confirmar}
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
