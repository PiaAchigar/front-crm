import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UnirContactoModal } from "../contacts/UnirContactoModal";
import { useUpdateContact, useVinculos } from "../contacts/useContacts";

const field = "w-full rounded border border-surface-highest bg-surface px-2 py-1.5 text-sm";

/** Un contacto que entró por WhatsApp sin ficha: su "nombre" es vacío o el propio número. */
export function sinNombre(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  return n === "" || /^\+?[\d\s().-]+$/.test(n);
}

/** Completa la ficha que el webhook ya creó para la conversación (no crea otra). */
export function GuardarClienteModal({
  contactId,
  nombreActual = null,
  telefono,
  onClose,
}: {
  contactId: string;
  /** Cómo se llama hoy el contacto de la conversación (el número, si vino del webhook). */
  nombreActual?: string | null;
  telefono: string | null;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [uniendo, setUniendo] = useState(false);
  const [quedaId, setQuedaId] = useState<string | null>(null);
  const qc = useQueryClient();
  const update = useUpdateContact();
  const { data: vinculos } = useVinculos(contactId);
  const otras = vinculos?.compartenNumero ?? [];
  const queda = otras.find((c) => c.id === (quedaId ?? otras[0]?.id)) ?? null;

  function guardar() {
    const name = `${nombre} ${apellido}`.trim();
    if (!nombre.trim() || update.isPending) return;
    update.mutate(
      { id: contactId, data: { name, email: email.trim() || undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["conversation"] });
          qc.invalidateQueries({ queryKey: ["contacts"] });
          qc.invalidateQueries({ queryKey: ["contact"] });
          onClose();
        },
      },
    );
  }

  if (uniendo && queda) {
    // La ficha que se queda es la existente; el contacto sin nombre del webhook se une adentro.
    // La conversación sigue sola: la unión re-apunta las FK.
    return (
      <UnirContactoModal
        contact={queda}
        candidatos={[queda, { id: contactId, name: nombreActual }]}
        onClose={() => setUniendo(false)}
        onUnido={() => {
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["conversation"] });
          qc.invalidateQueries({ queryKey: ["contacts"] });
          qc.invalidateQueries({ queryKey: ["contact"] });
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold text-primary">Guardar cliente</h2>
        {otras.length > 0 && (
          <div className="mb-3 flex flex-col gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            <span>
              {`Ya hay ${otras.length} ${otras.length === 1 ? "ficha" : "fichas"} con este número: ${otras
                .map((c) => c.name ?? "Sin nombre")
                .join(", ")}.`}
            </span>
            {otras.length > 1 && (
              <fieldset className="flex flex-col gap-1">
                <legend className="text-xs">¿Cuál ficha se queda?</legend>
                {otras.map((c) => (
                  <label key={c.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="queda"
                      checked={queda?.id === c.id}
                      onChange={() => setQuedaId(c.id)}
                    />
                    {c.name ?? "Sin nombre"}
                  </label>
                ))}
              </fieldset>
            )}
            <button
              className="self-start rounded-full border border-primary px-3 py-1 text-xs text-primary hover:bg-surface-high"
              onClick={() => setUniendo(true)}
            >
              Es la misma → Unir
            </button>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Nombre *
            <input
              autoFocus
              className={field}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Apellido
            <input className={field} value={apellido} onChange={(e) => setApellido(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Email
            <input
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Teléfono
            <input className={`${field} opacity-70`} value={telefono ?? ""} readOnly />
          </label>
        </div>
        {update.isError && (
          <p className="mt-2 text-xs text-red-600">{(update.error as Error).message}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            disabled={!nombre.trim() || update.isPending}
            onClick={guardar}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
