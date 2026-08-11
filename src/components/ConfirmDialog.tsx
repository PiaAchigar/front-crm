import { useEffect, useRef } from "react";

type Tone = "primary" | "danger";

/** Confirmación con la estética del resto del CRM, en reemplazo del `confirm()`
 *  del navegador: ese cartel no se puede maquetar, no respeta el tema y muestra
 *  la URL del sitio arriba, que a la dueña no le dice nada.
 *
 *  `points` es para las consecuencias concretas de la acción — leerlas en viñetas
 *  es mucho más rápido que en un párrafo, que es justo lo que uno quiere antes
 *  de decidir. */
export function ConfirmDialog({
  title,
  description,
  points,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
  tone = "primary",
  isPending = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  points?: string[];
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // El foco arranca en el botón de acción (como el confirm nativo) y Escape
  // cierra. Sin esto el diálogo queda fuera del alcance del teclado.
  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  const confirmClass =
    tone === "danger"
      ? "bg-red-700 hover:bg-red-800"
      : "bg-primary hover:bg-primary-dark";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      // Click en el fondo = cancelar, pero nunca en medio de una operación.
      onClick={() => !isPending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-xl bg-surface-low p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>

        {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}

        {points && points.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-lg bg-surface-high px-4 py-3 text-sm text-ink-soft">
            {points.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden="true" className="text-ink-soft">
                  •
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high disabled:opacity-40"
            onClick={onClose}
            disabled={isPending}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm text-white disabled:opacity-40 ${confirmClass}`}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
