import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatDateTimeToDate } from "../../lib/format";
import { pesos } from "../../lib/compras-ui";
import { useIgnorarVencimiento, useSaldosVencidos, useVencerSaldo } from "./useCompras";

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
 * Y tiene **dos salidas, no una** (2026-09-10): "Pasar a caja" se queda la
 * plata, "Ignorar" se la deja a la clienta. Con una sola, el único modo de
 * sacar del aviso un caso ya decidido era quedarse el dinero.
 */
export function SaldosVencidosAviso() {
  const { data } = useSaldosVencidos();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const vencer = useVencerSaldo();
  const ignorar = useIgnorarVencimiento();

  if (!data?.clientes.length) return null;

  const elegido = data.clientes.find((c) => c.customerId === confirmando);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-900">
          Saldo a favor vencido
          {data.clientes.length > 1 ? ` — ${data.clientes.length} clientes` : ""}
        </h2>
        <span className="text-sm font-semibold text-amber-900">{pesos(data.total)}</span>
      </div>
      <p className="mt-0.5 text-xs text-amber-800">
        Pasaron los 3 meses y no lo usaron. Al pasarlo a caja deja de estar disponible para la
        clienta.
      </p>

      {/* "Ignorar" no abre diálogo, así que si falla no hay dónde verlo: sin
          esto el botón parece no hacer nada. */}
      {ignorar.error && (
        <p className="mt-2 text-xs font-medium text-red-700">
          No se pudo ignorar: {(ignorar.error as Error).message}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {data.clientes.map((c) => (
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
                  <li key={o.id ?? i}>
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
              {/* "Ignorar" primero y en gris: es la salida que no mueve plata,
                  y la irreversible no debería ser la que queda más a mano. */}
              <button
                className="rounded-full px-3 py-1 text-xs text-ink-soft hover:bg-surface-high disabled:opacity-40"
                title="Al ignorar, la plata sigue siendo de la clienta: sólo se saca el aviso."
                disabled={ignorar.isPending}
                onClick={() => ignorar.mutate(c.customerId)}
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
