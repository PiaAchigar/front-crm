import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * `aaaa-mm-dd` con la fecha LOCAL. `toISOString()` da la fecha UTC y en
 * Argentina, pasadas las 21:00, ya es "mañana": proponía un día de más.
 */
export function aaaaMmDdLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Hoy + n días, en el formato `aaaa-mm-dd` que espera `<input type="date">`. */
export function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return aaaaMmDdLocal(d);
}

/**
 * Elegir hasta cuándo vale algo: un saldo a favor o una compra.
 *
 * Genérico: el que lo usa pone el título, el resumen de lo que se aplaza y la
 * fecha con la que arranca el selector (un saldo, +90 días; una compra, su
 * vencimiento + 30).
 *
 * **Una fecha, no una cantidad de meses** (decisión de Pia, 2026-09-10). El
 * caso real es "estuvo internada, dale hasta fin de año", no "sumale 60 días":
 * Laura ya sabe qué día quiere, y hacerla contar meses es pedirle que traduzca.
 *
 * El mínimo del selector es MAÑANA. Poner hoy lo dejaría elegir una fecha que
 * el backend rechaza —vence a las 00:00, o sea ya pasó—, y un calendario que
 * ofrece un día inválido es una trampa.
 */
export function AplazarDialog({
  titulo,
  resumen,
  fechaInicial,
  isPending,
  error,
  onConfirm,
  onClose,
}: {
  titulo: string;
  /** Qué se está aplazando: el texto y la lista que ve quien confirma. */
  resumen: ReactNode;
  /** `aaaa-mm-dd` con la que arranca el selector. */
  fechaInicial: string;
  isPending: boolean;
  error: string | null;
  onConfirm: (nuevaFecha: string, motivo: string) => void;
  onClose: () => void;
}) {
  // Arranca en un plazo normal (lo decide quien abre el diálogo): el caso más
  // común es darle otro plazo entero, y así Laura sólo corrige si quiere otra cosa.
  const [fecha, setFecha] = useState(fechaInicial);
  const [motivo, setMotivo] = useState("");
  const fechaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fechaRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !isPending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aplazar-title"
        className="w-full max-w-md rounded-xl bg-surface-low p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="aplazar-title" className="text-lg font-semibold text-ink">
          {titulo}
        </h2>
        {resumen}

        <label className="mt-4 block text-sm">
          <span className="text-ink-soft">Nueva fecha de vencimiento</span>
          <input
            ref={fechaRef}
            type="date"
            className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-1.5"
            value={fecha}
            min={enDias(1)}
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-ink-soft">Motivo (opcional)</span>
          <input
            type="text"
            className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-1.5"
            placeholder="Ej: la clienta estuvo internada"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {/* Queda pegado al origen del movimiento: dentro de tres meses es lo
              único que va a explicar por qué esa plata vence cuando vence. */}
          <span className="mt-1 block text-xs text-ink-soft">
            Queda anotado, para saber después por qué se aplazó.
          </span>
        </label>

        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high disabled:opacity-40"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            onClick={() => onConfirm(fecha, motivo)}
            disabled={isPending || !fecha}
          >
            {isPending ? "Aplazando…" : "Aplazar"}
          </button>
        </div>
      </div>
    </div>
  );
}
