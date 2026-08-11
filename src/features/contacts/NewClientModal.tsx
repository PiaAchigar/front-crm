import { useState } from "react";
import { useCreateClient } from "./useContacts";

/** El DNI es obligatorio y de 7 u 8 dígitos porque es la clave con la que el
 *  backend evita duplicados (5602 de los 5611 clientes migrados lo tienen
 *  cargado, así que la deduplicación es efectiva). Mismo criterio que el alta
 *  rápida de la Agenda. */
const DNI_RE = /^\d{7,8}$/;

export function NewClientModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const create = useCreateClient();

  const valid = name.trim().length >= 2 && DNI_RE.test(dni);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-5">
        <h2 className="mb-4 text-lg font-semibold text-ink">Nuevo Cliente</h2>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-ink-soft">Nombre *</span>
            <input
              className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-ink-soft">DNI *</span>
            <input
              className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
              inputMode="numeric"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
            />
          </label>

          <label className="block text-sm">
            <span className="text-ink-soft">Teléfono</span>
            <input
              className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-ink-soft">Email</span>
            <input
              className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>

        {create.error && (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {(create.error as Error).message}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white disabled:opacity-40"
            disabled={!valid || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  name: name.trim(),
                  dni,
                  phone: phone.trim() || undefined,
                  email: email.trim() || undefined,
                },
                { onSuccess: onClose },
              )
            }
          >
            {create.isPending ? "Creando…" : "Crear cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
