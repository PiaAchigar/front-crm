import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatDateTimeToDate } from "../../lib/format";
import { pesos } from "../../lib/compras-ui";
import { useSaldosVencidos, useVencerSaldo } from "./useCompras";

/**
 * Aviso de saldos a favor vencidos.
 *
 * **No se muestra si no hay nada.** Un aviso permanente que casi siempre dice
 * "no hay saldos vencidos" se vuelve invisible justo el día que tiene algo que
 * decir.
 *
 * El pase a caja **se confirma, no pasa solo** (decisión de Pia, 2026-09-09):
 * es plata que cambia de dueño, y si la clienta aparece al otro día
 * reclamando, con el automático Laura se entera cuando ya está hecho.
 *
 * **"Ignorar" es sacarse el cartel de encima, nada más** (2026-09-10). No toca
 * la plata, no toca el vencimiento y no se guarda en ningún lado: vive en la
 * memoria de este componente y por eso vuelve sola al volver a entrar. Que el
 * descarte se olvide es la característica, no una limitación — un saldo
 * vencido que nadie resolvió tiene que seguir molestando.
 *
 * Aplazar un vencimiento es otra cosa y se hace moviendo `expires_at` desde la
 * ficha de la clienta, no acá.
 */
export function SaldosVencidosAviso() {
  const { data } = useSaldosVencidos();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const [cerrado, setCerrado] = useState(false);
  const vencer = useVencerSaldo();

  const visibles = (data?.clientes ?? []).filter((c) => !descartadas.includes(c.customerId));
  if (cerrado || visibles.length === 0) return null;

  const elegido = visibles.find((c) => c.customerId === confirmando);
  // El total se recalcula sobre lo que se ve. Usar `data.total` dejaría un
  // encabezado que no suma las filas de abajo apenas se descarta una.
  const total = visibles.reduce((a, c) => a + c.vencido, 0);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-900">
          Saldo a favor vencido
          {visibles.length > 1 ? ` — ${visibles.length} clientes` : ""}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-900">{pesos(total)}</span>
          <button
            type="button"
            aria-label="Cerrar el aviso"
            title="Cierra el aviso por ahora. No cambia nada: la plata sigue vencida y el aviso vuelve cuando vuelvas a entrar."
            className="rounded-full px-2 text-lg leading-none text-amber-700 hover:bg-amber-100"
            onClick={() => setCerrado(true)}
          >
            ×
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-xs text-amber-800">
        Pasaron los 3 meses y no lo usaron. Al pasarlo a caja deja de estar disponible para la
        clienta.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {visibles.map((c) => (
          <li
            key={c.customerId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low p-3"
          >
            <div className="min-w-0">
              <Link to={`/contactos/${c.contactId}`} className="font-medium text-primary hover:underline">
                {c.nombre ?? "Sin nombre"}
              </Link>
              {/* De dónde salió cada peso. Meses después, "saldo vencido de
                  Mariana" sin el origen no le dice nada a nadie.

                  Las dos fechas van etiquetadas ("acreditado el" / "venció
                  el"): con una sola, la de vencimiento se leía como la fecha
                  de la cancelación —pasó de verdad, 2026-09-10—. Y si la
                  clienta gastó parte, se dice cuánto: si no, un lote de
                  $100.000 que muestra $80.000 no se puede explicar mirando
                  la pantalla. */}
              <ul className="mt-1 flex flex-col gap-0.5 text-xs text-ink-soft">
                {c.origenes.map((o, i) => (
                  <li key={i}>
                    <span className="font-medium text-ink">{pesos(o.monto)}</span>
                    {" — "}
                    {o.detalle ?? "saldo a favor"}
                    <br />
                    Acreditado el {formatDateTimeToDate(o.acreditadoEl)}
                    {o.venceEl ? ` · venció el ${formatDateTimeToDate(o.venceEl)}` : ""}
                    {o.original > o.monto && (
                      <> · de {pesos(o.original)}, ya usó {pesos(o.original - o.monto)}</>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{pesos(c.vencido)}</span>
              {/* En gris y sin confirmación: no hace nada más que dejar de
                  mostrarse. La acción que mueve plata es la de al lado. */}
              <button
                className="rounded-full px-3 py-1 text-xs text-ink-soft hover:bg-surface-high"
                title="Saca este aviso por ahora. No cambia nada: la plata sigue vencida y el aviso vuelve cuando vuelvas a entrar."
                onClick={() => setDescartadas((d) => [...d, c.customerId])}
              >
                Ignorar
              </button>
              <button
                className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-900 hover:bg-amber-100"
                title="Saca la plata de la cuenta de la clienta y la suma a la caja del día."
                onClick={() => setConfirmando(c.customerId)}
              >
                Pasar a caja
              </button>
            </div>
          </li>
        ))}
      </ul>

      {elegido && (
        <ConfirmDialog
          title={`¿Pasar ${pesos(elegido.vencido)} a la caja?`}
          description={`Es el saldo vencido de ${elegido.nombre ?? "esta clienta"}.`}
          points={[
            "Entra a la caja del día con el detalle de dónde vino.",
            "La clienta deja de tener esa plata a favor.",
            "Si querés dárselo igual, cerrá esto: mientras no lo pases, lo podés seguir usando en una venta.",
          ]}
          confirmLabel="Pasarlo a caja"
          pendingLabel="Pasando…"
          cancelLabel="Volver"
          isPending={vencer.isPending}
          error={vencer.error ? (vencer.error as Error).message : null}
          onConfirm={() =>
            vencer.mutate(elegido.customerId, { onSuccess: () => setConfirmando(null) })
          }
          onClose={() => setConfirmando(null)}
        />
      )}
    </section>
  );
}
