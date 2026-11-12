import { useState } from "react";
import type { Contact, UnionPreview } from "../../api/contacts";
import { ApiError } from "../../api/client";
import { useContactsList, useUnionPreview, useUnirContactos, useVinculos } from "./useContacts";

const MSG_409 = "No se pueden unir: tienen DNI o CUIT distintos";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function resumen(p: UnionPreview, a: string, b: string): string {
  return `Se pasan ${plural(p.turnos, "turno", "turnos")} y ${plural(p.conversaciones, "conversación", "conversaciones")} de ${b} a ${a}. ${b} se borra.`;
}

function extras(p: UnionPreview, b: string): string | null {
  const partes = [
    p.pagos > 0 && plural(p.pagos, "pago", "pagos"),
    p.facturas > 0 && plural(p.facturas, "factura", "facturas"),
    p.compras > 0 && plural(p.compras, "compra", "compras"),
    p.aCargo > 0 && `${plural(p.aCargo, "persona", "personas")} a cargo de ${b} que ${p.aCargo === 1 ? "pasa" : "pasan"} a estar a cargo de esta ficha`,
  ].filter(Boolean);
  return partes.length ? `También pasan: ${partes.join(", ")}.` : null;
}

function mensajeDeError(e: unknown): string {
  const msg = (e as Error).message?.trim();
  if (msg) return msg;
  if (e instanceof ApiError && e.status === 409) return MSG_409;
  return "No se pudo unir";
}

/** Une una ficha duplicada (B) dentro de la actual (A): A queda, B se borra. */
export function UnirContactoModal({
  contact,
  onClose,
  candidatos,
  onUnido,
}: {
  contact: Pick<Contact, "id" | "name">;
  onClose: () => void;
  /** Si viene, se elige entre estas fichas en vez de buscar (y con una sola queda preseleccionada). */
  candidatos?: Pick<Contact, "id" | "name">[];
  /** Recibe el id de la ficha que se borró. */
  onUnido?: (duplicadoId: string) => void;
}) {
  const [q, setQ] = useState("");
  const otrosFijos = candidatos?.filter((c) => c.id !== contact.id);
  const [elegido, setElegido] = useState<Pick<Contact, "id" | "name"> & Partial<Contact> | null>(
    otrosFijos?.length === 1 ? otrosFijos[0] : null,
  );
  const buscar = q.trim().length >= 2;
  const { data } = useContactsList({ q: buscar ? q.trim() : undefined, limit: 8, offset: 0 });
  const preview = useUnionPreview(contact.id, elegido?.id ?? null);
  const unir = useUnirContactos();
  const { data: vinculos } = useVinculos(contact.id);

  const nombreA = contact.name ?? "esta ficha";
  const nombreB = elegido?.name ?? "la otra ficha";
  const encontrados: (Pick<Contact, "id" | "name"> & Partial<Contact>)[] = otrosFijos
    ?? (buscar ? (data?.items ?? []).filter((c) => c.id !== contact.id) : []);
  const errorMsg = unir.error ?? preview.error;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-primary">Unir con otro contacto</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Para cuando son la misma persona cargada dos veces. La ficha de {nombreA} se queda y la
          otra se borra.
        </p>

        {!elegido ? (
          <>
            {!otrosFijos && <input
              autoFocus
              className="w-full rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              placeholder="Buscar por nombre, teléfono o email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />}
            <ul className="mt-2 flex max-h-60 flex-col gap-1 overflow-y-auto">
              {encontrados.map((c) => (
                <li key={c.id}>
                  <button
                    className="w-full rounded-lg p-2 text-left text-sm hover:bg-surface-high"
                    onClick={() => setElegido(c)}
                  >
                    <span className="font-medium">{c.name ?? "Sin nombre"}</span>
                    <span className="ml-2 text-xs text-ink-soft">{c.phone ?? c.email ?? ""}</span>
                  </button>
                </li>
              ))}
              {!otrosFijos && buscar && data && encontrados.length === 0 && (
                <li className="p-2 text-sm text-ink-soft">No encontramos a nadie.</li>
              )}
            </ul>
          </>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            {preview.isLoading && <p className="text-ink-soft">Calculando…</p>}
            {preview.data && (
              <>
                <p>{resumen(preview.data, nombreA, nombreB)}</p>
                {preview.data.pierdeTitular && (
                  <p className="rounded bg-amber-50 px-3 py-2 text-amber-900">
                    {vinculos?.titular?.name
                      ? `Ojo: ${vinculos.titular.name} deja de estar a cargo de ${nombreA}, porque ${nombreA} pasa a tener a cargo a las personas de ${nombreB}.`
                      : `Ojo: ${nombreA} deja de estar tutelado/a, porque pasa a tener a cargo a las personas de ${nombreB}.`}
                  </p>
                )}
                {extras(preview.data, nombreB) && <p className="text-ink-soft">{extras(preview.data, nombreB)}</p>}
              </>
            )}
            {errorMsg && (
              <p className="rounded bg-red-50 px-3 py-2 text-red-800">{mensajeDeError(errorMsg)}</p>
            )}
            {otrosFijos?.length !== 1 && (
              <button
                className="self-start text-xs text-primary hover:underline"
                onClick={() => {
                  setElegido(null);
                  unir.reset();
                }}
              >
                Elegir otra ficha
              </button>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          {elegido && (
            <button
              className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
              disabled={!preview.data || unir.isPending}
              onClick={() =>
                unir.mutate(
                  { id: contact.id, duplicadoId: elegido.id },
                  {
                    onSuccess: () => {
                      onUnido?.(elegido.id);
                      onClose();
                    },
                  },
                )
              }
            >
              {unir.isPending ? "Uniendo…" : "Unir fichas"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
