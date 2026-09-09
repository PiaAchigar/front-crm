import { useState } from "react";
import type { MedioDePago } from "../../api/compras";
import { pesos } from "../../lib/compras-ui";
import { useCobrarCompra } from "./useCompras";

/**
 * El paso de cobro, después de vender.
 *
 * Sin esto la venta quedaba a medias: la compra nacía con $0 pagado y diciendo
 * "Debe $166.000", y había que ir a cobrarla a otra pantalla con la clienta
 * esperando en el mostrador (planteado por Pia, 2026-09-09).
 *
 * No inventa nada de facturación: manda al MISMO `checkout()` que usa el
 * mostrador, que ya resuelve la factura ARCA, el split declarado/no declarado
 * y el movimiento de caja.
 */

const MEDIOS: { valor: MedioDePago; texto: string }[] = [
  { valor: "cash", texto: "Efectivo" },
  { valor: "debit_card", texto: "Débito" },
  { valor: "credit_card", texto: "Crédito" },
  { valor: "bank_transfer", texto: "Transferencia" },
  { valor: "mercadopago", texto: "MercadoPago" },
];

export function CobrarPaso({
  compraId,
  customerId,
  descripcion,
  pendiente,
  minimo,
  onListo,
}: {
  compraId: string;
  customerId: string;
  descripcion: string;
  /** Lo que falta cobrar, ya descontado el saldo a favor aplicado. */
  pendiente: number;
  /** Lo mínimo que se puede cobrar ahora (el 40%, o menos si ya se cubrió). */
  minimo: number;
  onListo: () => void;
}) {
  const cobrar = useCobrarCompra(customerId);
  const [monto, setMonto] = useState(pendiente);
  const [method, setMethod] = useState<MedioDePago>("cash");
  const [wantsInvoice, setWantsInvoice] = useState(false);

  const falta = monto < minimo;
  const sobra = monto > pendiente;
  const invalido = monto <= 0 || falta || sobra;

  return (
    <div className="flex flex-col gap-3 p-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Cobrar</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{descripcion}</p>
      </div>

      <div className="rounded-lg border border-surface-high bg-surface-high/40 p-3 text-sm">
        <div className="flex justify-between font-semibold text-ink">
          <span>A cobrar</span>
          <span>{pesos(pendiente)}</span>
        </div>
        {minimo > 0 && (
          <p className="mt-1 text-xs text-ink-soft">
            Mínimo del primer pago: {pesos(minimo)} (el 40%).
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full border border-surface-highest px-3 py-1 text-xs hover:bg-surface-high"
          onClick={() => setMonto(pendiente)}
        >
          Todo · {pesos(pendiente)}
        </button>
        {minimo > 0 && minimo < pendiente && (
          <button
            className="rounded-full border border-surface-highest px-3 py-1 text-xs hover:bg-surface-high"
            onClick={() => setMonto(minimo)}
          >
            Seña 40% · {pesos(minimo)}
          </button>
        )}
      </div>

      <label className="block text-sm">
        <span className="text-ink-soft">Monto</span>
        <input
          type="number"
          aria-label="Monto"
          className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value) || 0)}
        />
      </label>

      {/* El aviso va acá, al lado del número, y no como error después de
          apretar: el que cobra está escribiendo y tiene que verlo mientras. */}
      {falta && (
        <p className="text-xs text-rose-700">
          El primer pago tiene que ser de al menos {pesos(minimo)}.
        </p>
      )}
      {sobra && (
        <p className="text-xs text-rose-700">
          No se puede cobrar más de {pesos(pendiente)}, que es lo que falta.
        </p>
      )}

      <label className="block text-sm">
        <span className="text-ink-soft">Medio de pago</span>
        <select
          className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
          value={method}
          onChange={(e) => setMethod(e.target.value as MedioDePago)}
        >
          {MEDIOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.texto}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={wantsInvoice}
          onChange={(e) => setWantsInvoice(e.target.checked)}
        />
        <span>
          Lleva factura
          <span className="block text-xs text-ink-soft">
            Emite comprobante por ARCA. Un pago parcial también se puede facturar.
          </span>
        </span>
      </label>

      {cobrar.error && <p className="text-sm text-rose-700">{(cobrar.error as Error).message}</p>}

      <div className="flex justify-end gap-2 border-t border-surface-high pt-3">
        {/* La venta YA está hecha: esto sólo decide si se cobra ahora. Por eso
            no dice "Cancelar" — cancelar sugeriría deshacerla. */}
        <button
          className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
          onClick={onListo}
          disabled={cobrar.isPending}
        >
          Cobrar después
        </button>
        <button
          className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
          disabled={invalido || cobrar.isPending}
          onClick={() =>
            cobrar.mutate(
              { id: compraId, amount: monto, method, wantsInvoice },
              { onSuccess: onListo },
            )
          }
        >
          {cobrar.isPending ? "Cobrando…" : `Cobrar ${pesos(monto)}`}
        </button>
      </div>
    </div>
  );
}
