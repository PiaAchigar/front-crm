import { useEffect, useMemo, useState } from "react";
import type { ItemDeCatalogo, OrigenVenta } from "../../api/compras";
import { pesos } from "../../lib/compras-ui";
import { useCatalogoVendible, useCotizacion, useVender } from "./useCompras";

/**
 * Vender: elegir qué, cuántas sesiones y con qué promo.
 *
 * El precio NO se calcula acá. Se le pide al backend en cada cambio
 * (`/purchases/quote`), y lo que se manda a vender son exactamente esos
 * montos: lo que se congela es lo que Laura vio en pantalla, no una cuenta
 * que el navegador rehaga con un catálogo que puede estar viejo.
 */

const SOLAPAS: { clave: keyof Catalogo3; titulo: string }[] = [
  { clave: "depilacion", titulo: "Packs de depilación" },
  { clave: "combos", titulo: "Combos" },
  { clave: "servicios", titulo: "Servicios" },
];

type Catalogo3 = { depilacion: ItemDeCatalogo[]; combos: ItemDeCatalogo[]; servicios: ItemDeCatalogo[] };

export function VenderModal({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const { data: catalogo, isLoading } = useCatalogoVendible(true);
  const vender = useVender(customerId);

  const [solapa, setSolapa] = useState<keyof Catalogo3>("depilacion");
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<ItemDeCatalogo | null>(null);
  const [sesiones, setSesiones] = useState(1);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const cotizacion = useCotizacion({
    origen: (elegido?.origen ?? null) as OrigenVenta | null,
    id: elegido?.id ?? null,
    sessions: sesiones,
    promotionId,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !vender.isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, vender.isPending]);

  const lista = useMemo(() => {
    const items = catalogo?.[solapa] ?? [];
    const q = busqueda.trim().toLowerCase();
    return q ? items.filter((i) => i.nombre.toLowerCase().includes(q)) : items;
  }, [catalogo, solapa, busqueda]);

  function elegir(item: ItemDeCatalogo) {
    setElegido(item);
    // Las del pack por defecto: es la venta que tiene descuento, y ofrecer
    // otro número sería ofrecer un precio peor sin explicar por qué.
    setSesiones(item.packSesiones ?? 1);
  }

  const q = cotizacion.data;
  // El pack descuenta sólo con sus sesiones. Cuando no, hay que decirlo: si no
  // el precio "sube" al tocar el número y parece un error del sistema.
  const conDescuentoDePack = !!elegido?.packSesiones && sesiones === elegido.packSesiones;
  const sinDescuento = !!q && q.discountedAmount >= q.baseAmount;

  function handleVender() {
    if (!q) return;
    vender.mutate({ ...q, notes: notes.trim() || null }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-surface-low">
        <div className="border-b border-surface-high px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Vender a la clienta</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            El precio se congela al vender: si mañana cambia el catálogo, esta compra no se mueve.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_20rem]">
          {/* Elegir qué */}
          <div className="flex min-h-0 flex-col border-r border-surface-high p-4">
            <div role="tablist" className="mb-3 flex gap-1">
              {SOLAPAS.map((s) => (
                <button
                  key={s.clave}
                  role="tab"
                  aria-selected={solapa === s.clave}
                  className={
                    solapa === s.clave
                      ? "rounded-full bg-primary px-3 py-1 text-xs text-white"
                      : "rounded-full border border-surface-highest px-3 py-1 text-xs text-ink-soft hover:bg-surface-high"
                  }
                  onClick={() => setSolapa(s.clave)}
                >
                  {s.titulo}
                </button>
              ))}
            </div>

            <input
              className="mb-3 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
              placeholder="Buscar…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-ink-soft">Cargando el catálogo…</p>
              ) : lista.length === 0 ? (
                <p className="text-sm text-ink-soft">Nada que coincida.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {lista.map((item) => (
                    <li key={`${item.origen}-${item.id}`}>
                      <button
                        className={
                          elegido?.id === item.id && elegido.origen === item.origen
                            ? "flex w-full items-center justify-between gap-3 rounded border border-primary bg-surface-high px-3 py-2 text-left text-sm"
                            : "flex w-full items-center justify-between gap-3 rounded border border-transparent px-3 py-2 text-left text-sm hover:bg-surface-high"
                        }
                        onClick={() => elegir(item)}
                      >
                        <span className="text-ink">{item.nombre}</span>
                        <span className="shrink-0 text-xs text-ink-soft">
                          {item.precioDesde > 0 ? pesos(item.precioDesde) : "sin precio"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Cuánto sale */}
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
            {!elegido ? (
              <p className="text-sm text-ink-soft">Elegí qué le vas a vender.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-ink">{elegido.nombre}</p>

                <label className="block text-sm">
                  <span className="text-ink-soft">Sesiones</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
                    value={sesiones}
                    disabled={elegido.origen === "combo"}
                    onChange={(e) => setSesiones(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>

                {elegido.packSesiones != null && !conDescuentoDePack && (
                  <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Sin el descuento del pack: son {elegido.packSesiones} sesiones. Con otro número
                    se venden al precio de lista.
                  </p>
                )}

                <label className="block text-sm">
                  <span className="text-ink-soft">Promo</span>
                  <select
                    className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
                    value={promotionId ?? ""}
                    onChange={(e) => setPromotionId(e.target.value || null)}
                  >
                    <option value="">Sin promo</option>
                    {catalogo?.promociones.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name ?? "Sin nombre"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="text-ink-soft">Nota</span>
                  <textarea
                    className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>

                <div className="rounded-lg border border-surface-high bg-surface-high/40 p-3 text-sm">
                  {cotizacion.isError ? (
                    <p className="text-rose-700">{(cotizacion.error as Error).message}</p>
                  ) : !q ? (
                    <p className="text-ink-soft">Calculando…</p>
                  ) : (
                    <dl className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">Precio de lista</dt>
                        <dd className={sinDescuento ? "" : "text-ink-soft line-through"}>
                          {pesos(q.baseAmount)}
                        </dd>
                      </div>
                      {!sinDescuento && (
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Con el pack</dt>
                          <dd>{pesos(q.discountedAmount)}</dd>
                        </div>
                      )}
                      {q.finalAmount !== q.discountedAmount && (
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Con la promo</dt>
                          <dd>{pesos(q.finalAmount)}</dd>
                        </div>
                      )}
                      <div className="mt-1 flex justify-between border-t border-surface-highest pt-1 font-semibold text-ink">
                        <dt>Total</dt>
                        <dd>{pesos(q.finalAmount)}</dd>
                      </div>
                      {q.baseAmount > q.finalAmount && (
                        <p className="text-xs text-emerald-700">
                          Ahorra {pesos(q.baseAmount - q.finalAmount)}
                        </p>
                      )}
                    </dl>
                  )}
                </div>
              </>
            )}

            {vender.error && (
              <p className="text-sm text-rose-700">{(vender.error as Error).message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-high px-5 py-3">
          <button
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
            disabled={vender.isPending}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            onClick={handleVender}
            disabled={!q || vender.isPending}
          >
            {vender.isPending ? "Vendiendo…" : "Vender"}
          </button>
        </div>
      </div>
    </div>
  );
}
