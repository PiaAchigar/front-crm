import { useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { pesos } from "../../lib/compras-ui";
import { formatDateTimeToDate } from "../../lib/format";
import type { LoteDeSaldo } from "../../api/compras";
import { useAplazarVencimiento, useSaldoDeCliente, useVencerSaldo } from "./useCompras";
import { AplazarDialog } from "./AplazarDialog";

/**
 * El saldo a favor de la clienta, abierto en sus acreditaciones.
 *
 * **Reemplaza al número suelto** que había en "Cuenta de cliente".
 * `credit_balance` suma lo vigente con lo vencido y no dice cuándo vence nada,
 * así que con la clienta en el mostrador no alcanza para responderle "¿hasta
 * cuándo tengo?" — que es la única pregunta que hace.
 *
 * Dos acciones sobre lo vencido:
 * - **Pasar a caja** va en el encabezado, no por fila, porque el backend cobra
 *   TODO lo vencido de la clienta junto. Un botón por fila prometería elegir
 *   cuál, y no se puede.
 * - **Aplazar** sí va por fila, y también en bloque cuando hay más de una: cada
 *   plata entró por un motivo distinto y puede merecer un plazo distinto.
 */
export function SaldoCard({ customerId }: { customerId: string }) {
  const { data, isLoading } = useSaldoDeCliente(customerId);
  const [aplazando, setAplazando] = useState<LoteDeSaldo[] | null>(null);
  const [pasandoACaja, setPasandoACaja] = useState(false);
  const aplazar = useAplazarVencimiento(customerId);
  const vencer = useVencerSaldo();

  if (isLoading || !data) return null;

  const vencidos = data.lotes.filter((l) => l.vencido);

  return (
    <section className="rounded-xl border border-surface-high bg-surface-low p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Saldo a favor
        </h2>
        {data.vencido > 0 && (
          <div className="flex items-center gap-2">
            {vencidos.length > 1 && (
              <button
                className="rounded-full border border-surface-highest px-3 py-1 text-xs text-ink-soft hover:bg-surface-high"
                onClick={() => setAplazando(vencidos)}
              >
                Aplazar todo lo vencido
              </button>
            )}
            <button
              className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-900 hover:bg-amber-100"
              title="Saca la plata de la cuenta de la clienta y la suma a la caja del día."
              onClick={() => setPasandoACaja(true)}
            >
              Pasar {pesos(data.vencido)} a caja
            </button>
          </div>
        )}
      </div>

      {data.total === 0 ? (
        <p className="text-sm text-ink-soft">Sin saldo a favor.</p>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-medium text-ink">{pesos(data.vigente)}</span>{" "}
            <span className="text-ink-soft">disponible</span>
            {data.vencido > 0 && (
              <>
                {" · "}
                <span className="font-medium text-amber-800">{pesos(data.vencido)}</span>{" "}
                <span className="text-ink-soft">vencido</span>
              </>
            )}
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {data.lotes.map((l, i) => (
              <li
                key={l.id ?? i}
                className={`flex flex-wrap items-start justify-between gap-2 rounded-lg p-3 ${
                  l.vencido ? "bg-amber-50" : "bg-surface-high"
                }`}
              >
                <div className="min-w-0 text-xs text-ink-soft">
                  <p>
                    <span className="text-sm font-medium text-ink">{pesos(l.monto)}</span>
                    {l.vencido && (
                      <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                        Vencido
                      </span>
                    )}
                    {" — "}
                    {l.detalle ?? "saldo a favor"}
                  </p>
                  <p className="mt-0.5">
                    Acreditado el {formatDateTimeToDate(l.acreditadoEl)}
                    {l.venceEl
                      ? ` · ${l.vencido ? "venció" : "vence"} el ${formatDateTimeToDate(l.venceEl)}`
                      : " · sin vencimiento"}
                    {l.original > l.monto && (
                      <> · de {pesos(l.original)}, ya usó {pesos(l.original - l.monto)}</>
                    )}
                  </p>
                  {/* El historial de aplazos, uno por línea. Es lo que responde
                      "¿por qué esta plata vence en diciembre?" meses después. */}
                  {l.aplazos.map((a, j) => (
                    <p key={j} className="mt-0.5 italic">
                      {a}
                    </p>
                  ))}
                </div>
                {l.venceEl && (
                  <button
                    className="rounded-full border border-surface-highest px-3 py-1 text-xs text-ink-soft hover:bg-surface-low"
                    title="Corre la fecha de vencimiento para adelante."
                    onClick={() => setAplazando([l])}
                  >
                    Aplazar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {aplazando && (
        <AplazarDialog
          lotes={aplazando}
          isPending={aplazar.isPending}
          error={aplazar.error ? (aplazar.error as Error).message : null}
          onClose={() => {
            aplazar.reset();
            setAplazando(null);
          }}
          onConfirm={(nuevaFecha, motivo) =>
            aplazar.mutate(
              {
                movimientoIds: aplazando.map((l) => l.id).filter((v): v is string => v != null),
                nuevaFecha,
                motivo: motivo.trim() || undefined,
              },
              { onSuccess: () => setAplazando(null) },
            )
          }
        />
      )}

      {pasandoACaja && (
        <ConfirmDialog
          title={`¿Pasar ${pesos(data.vencido)} a la caja?`}
          description="Es todo el saldo vencido de esta clienta."
          points={[
            "Entra a la caja del día con el detalle de dónde vino.",
            "La clienta deja de tener esa plata a favor.",
            "Si querés darle más tiempo en vez de quedártela, cerrá esto y usá Aplazar.",
          ]}
          confirmLabel="Pasarlo a caja"
          pendingLabel="Pasando…"
          cancelLabel="Volver"
          isPending={vencer.isPending}
          error={vencer.error ? (vencer.error as Error).message : null}
          onConfirm={() =>
            vencer.mutate(customerId, { onSuccess: () => setPasandoACaja(false) })
          }
          onClose={() => setPasandoACaja(false)}
        />
      )}
    </section>
  );
}
