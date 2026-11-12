import type { MotivoTelefono } from "../../lib/telefono";

const TITULO: Record<MotivoTelefono, string> = {
  con15: "Este número parece tener 15.",
  con0: "Este número parece tener 0.",
  corto: "Este número parece incompleto.",
  extranjero: "Este número no parece ser argentino.",
};

/** Cartel de verificación: avisa, no bloquea. */
export function AvisoTelefonoDialog({
  motivo,
  onCorregir,
  onGuardarIgual,
}: {
  motivo: MotivoTelefono;
  onCorregir: () => void;
  onGuardarIgual: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div role="alertdialog" className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-primary">{TITULO[motivo]}</h2>
        <p className="text-sm text-ink">
          WhatsApp lo necesita así: 549 + código de área sin 0 + número sin 15. Ej: 5491130317884.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onGuardarIgual}
          >
            Guardar igual
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
            onClick={onCorregir}
          >
            Corregir
          </button>
        </div>
      </div>
    </div>
  );
}
