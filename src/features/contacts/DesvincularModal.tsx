import { useState } from "react";
import { diagnosticoTelefono } from "../../lib/telefono";
import { TITULO } from "./AvisoTelefonoDialog";

const field = "rounded border border-surface-highest bg-surface px-3 py-2 text-sm";

/** Pide el WhatsApp propio de quien se desvincula. `null` = "sin número por ahora". */
export function DesvincularModal({
  nombre,
  onConfirm,
  onClose,
  isPending = false,
  error = null,
}: {
  nombre: string;
  onConfirm: (telefonoPropio: string | null) => void;
  onClose: () => void;
  isPending?: boolean;
  error?: string | null;
}) {
  const [tel, setTel] = useState("");
  const diag = tel.trim() ? diagnosticoTelefono(tel) : null;
  const valido = diag?.ok === true;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" className="w-full max-w-sm rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-primary">{`Desvincular a ${nombre}`}</h2>
        <p className="mb-3 text-sm text-ink">
          {`¿${nombre} tiene WhatsApp propio? Cargalo así los avisos y turnos le llegan a ${nombre}.`}
        </p>
        <input
          className={`${field} w-full`}
          aria-label="WhatsApp propio"
          inputMode="tel"
          placeholder="Ej: 1130317884"
          value={tel}
          onChange={(e) => setTel(e.target.value)}
        />
        {diag && !diag.ok && <p className="mt-2 text-xs text-red-700">{TITULO[diag.motivo]}</p>}
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high disabled:opacity-40"
            disabled={isPending}
            onClick={() => onConfirm(null)}
          >
            Sin número por ahora
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            disabled={!valido || isPending}
            onClick={() => onConfirm(tel.trim())}
          >
            {isPending ? "Guardando…" : "Guardar y desvincular"}
          </button>
        </div>
      </div>
    </div>
  );
}
