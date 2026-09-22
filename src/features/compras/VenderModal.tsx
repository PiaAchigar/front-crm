import { useEffect, useMemo, useState } from "react";
import type { ItemDeCatalogo, OrigenVenta, PromoVendible } from "../../api/compras";
import { pesos, saldoQueEntra } from "../../lib/compras-ui";
import { promosQueAplican } from "../../lib/promo-aplica";
import { desgloseDePromo, esPaquete } from "../../lib/promos-para-vender";
import { useCatalogoVendible, useCotizacion, useVender } from "./useCompras";
import { CobrarPaso } from "./CobrarPaso";

/**
 * Vender: elegir qué, cuántas sesiones y con qué promo.
 *
 * El precio NO se calcula acá. Se le pide al backend en cada cambio
 * (`/purchases/quote`), y lo que se manda a vender son exactamente esos
 * montos: lo que se congela es lo que Laura vio en pantalla, no una cuenta
 * que el navegador rehaga con un catálogo que puede estar viejo.
 */

const SOLAPAS: { clave: SolapaClave; titulo: string }[] = [
  { clave: "depilacion", titulo: "Packs de depilación" },
  { clave: "combos", titulo: "Combos" },
  { clave: "servicios", titulo: "Servicios" },
  { clave: "capacitaciones", titulo: "Capacitaciones" },
  { clave: "promos", titulo: "Promos" },
];

type Catalogo3 = {
  depilacion: ItemDeCatalogo[];
  combos: ItemDeCatalogo[];
  servicios: ItemDeCatalogo[];
  capacitaciones: ItemDeCatalogo[];
};

// "promos" no sale de `catalogo[solapa]` como las otras cuatro: la lista de
// esa solapa es `catalogo.promociones`, con su propio renderizado.
type SolapaClave = keyof Catalogo3 | "promos";

export function VenderModal({
  customerId,
  saldoAFavor,
  onClose,
}: {
  customerId: string;
  /** Saldo a favor de la clienta. Lo primero que se le ofrece antes de cobrar. */
  saldoAFavor: number;
  onClose: () => void;
}) {
  const { data: catalogo, isLoading } = useCatalogoVendible(true);
  const vender = useVender(customerId);

  const [solapa, setSolapa] = useState<SolapaClave>("depilacion");
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<ItemDeCatalogo | null>(null);
  const [sesiones, setSesiones] = useState(1);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  // Un paquete se vende entero, de un saque: no convive con un item suelto
  // elegido. Los dos puestos a la vez es un estado imposible.
  const [paqueteElegido, setPaqueteElegido] = useState<PromoVendible | null>(null);
  // Qué promo de descuento está desplegada en la solapa Promos, para mostrar
  // sus items.
  const [promoDesplegada, setPromoDesplegada] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [usarSaldo, setUsarSaldo] = useState(false);
  // Una vez vendido, el modal NO cierra: pasa a cobrar. La venta ya está
  // hecha, así que esto sólo decide si se cobra ahora o después.
  const [vendida, setVendida] = useState<{
    id: string;
    descripcion: string;
    pendiente: number;
    minimo: number;
  } | null>(null);

  const cotizacion = useCotizacion({
    origen: paqueteElegido ? "paquete" : ((elegido?.origen ?? null) as OrigenVenta | null),
    id: elegido?.id ?? null,
    sessions: sesiones,
    promotionId: paqueteElegido ? paqueteElegido.id : promotionId,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !vender.isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, vender.isPending]);

  const lista = useMemo(() => {
    // La solapa Promos no lista `catalogo.promociones` acá: se renderiza
    // aparte, porque un paquete y un descuento se tocan distinto.
    if (solapa === "promos") return [];
    const items = catalogo?.[solapa] ?? [];
    const q = busqueda.trim().toLowerCase();
    return q ? items.filter((i) => i.nombre.toLowerCase().includes(q)) : items;
  }, [catalogo, solapa, busqueda]);

  // Todo lo vendible, indexado por id, para resolver a qué item apunta cada
  // destino de una promo de descuento (la solapa Promos no vuelve a pedirle
  // nada al backend: usa el catálogo que el modal ya tiene cargado).
  const itemsPorId = useMemo(() => {
    const m = new Map<string, ItemDeCatalogo>();
    if (catalogo) {
      for (const l of [
        catalogo.servicios ?? [],
        catalogo.combos ?? [],
        catalogo.depilacion ?? [],
        catalogo.capacitaciones ?? [],
      ]) {
        for (const it of l) m.set(it.id, it);
      }
    }
    return m;
  }, [catalogo]);

  // Sólo las promos que sirven para lo elegido. Antes se listaban todas y se
  // le podía aplicar a un Baby Botox una promo pensada para depilación.
  const promosDisponibles = useMemo(
    () => promosQueAplican(catalogo?.promociones ?? [], elegido),
    [catalogo, elegido],
  );

  // Si la promo elegida dejó de aplicar al cambiar de item, se suelta sola:
  // dejarla puesta vende con un descuento que el backend rechaza.
  useEffect(() => {
    if (promotionId && !promosDisponibles.some((p) => p.id === promotionId)) {
      setPromotionId(null);
    }
  }, [promosDisponibles, promotionId]);

  function elegir(item: ItemDeCatalogo) {
    // Elegir un item suelto suelta el paquete elegido: los dos puestos a la
    // vez es un estado imposible que termina en una venta mal armada.
    setPaqueteElegido(null);
    setElegido(item);
    // Las del pack por defecto: es la venta que tiene descuento, y ofrecer
    // otro número sería ofrecer un precio peor sin explicar por qué.
    setSesiones(item.packSesiones ?? 1);
  }

  // Paquete: una sola fila, se toca y queda elegida entera. Se vende de un
  // saque, sin sesiones a elegir.
  function elegirPaquete(promo: PromoVendible) {
    setElegido(null);
    setPaqueteElegido(promo);
  }

  // Descuento: se despliega, se toca UN item de adentro y queda elegido ESE,
  // con la promo ya puesta — el camino de hoy, ahora encontrable desde acá.
  function elegirItemDePromo(promo: PromoVendible, item: ItemDeCatalogo) {
    elegir(item);
    setPromotionId(promo.id);
  }

  const q = cotizacion.data;
  const conDescuentoDePack = !!elegido?.packSesiones && sesiones === elegido.packSesiones;
  const sinDescuento = !!q && q.discountedAmount >= q.baseAmount;

  // El aviso de "sin descuento" SÓLO cuando de verdad se está perdiendo algo.
  //
  // Antes salía siempre que las sesiones no fueran las del pack, y eso incluía
  // el caso más común de todos: vender UN servicio suelto. Decirle a Laura
  // "sin el descuento del pack" cada vez que vende un lifting de pestañas es
  // ruido sobre la operación normal.
  const avisaFaltaDePack = !!elegido?.packSesiones && sesiones > 1 && !conDescuentoDePack;

  const aplicable = q ? saldoQueEntra(q.finalAmount, saldoAFavor) : 0;
  const conSaldo = usarSaldo ? aplicable : 0;
  const restaPagar = q ? Math.max(0, q.finalAmount - conSaldo) : 0;

  function handleVender() {
    if (!q) return;
    vender.mutate(
      { ...q, notes: notes.trim() || null, usarSaldo: conSaldo },
      {
        onSuccess: (compra) => {
          const yaPagado = compra.pagadoConSaldo ?? 0;
          const pendiente = Math.max(0, q.finalAmount - yaPagado);

          // Si el saldo a favor cubrió todo no hay paso de cobro: pedirle a
          // Laura que "cobre $0" no significa nada, y la única salida que le
          // quedaba era "Cobrar después" —que promete un cobro inexistente
          // sobre una compra que ya está paga— (reportado por Pia, 2026-09-10).
          // La compra aparece en la lista con su pastilla verde: ese es el aviso.
          if (pendiente === 0) {
            onClose();
            return;
          }

          setVendida({
            id: compra.id,
            descripcion: q.description,
            pendiente,
            // El 40% es sobre el ACUMULADO: lo que el saldo a favor ya cubrió
            // cuenta, así que el mínimo es lo que falte para llegar.
            minimo: Math.max(
              0,
              Math.min(
                q.finalAmount - yaPagado,
                Math.round(q.finalAmount * 0.4) - yaPagado,
              ),
            ),
          });
        },
      },
    );
  }

  if (vendida) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-surface-low">
          <CobrarPaso
            compraId={vendida.id}
            customerId={customerId}
            descripcion={vendida.descripcion}
            pendiente={vendida.pendiente}
            minimo={vendida.minimo}
            onListo={onClose}
          />
        </div>
      </div>
    );
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

        {/* Alto FIJO y no `flex-1`: con el alto adaptado al contenido, el modal
            pegaba un salto al cambiar de solapa —3 packs contra 120
            servicios— y los botones se movían de lugar debajo del cursor. */}
        <div className="grid h-[28rem] grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_20rem]">
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
              ) : solapa === "promos" ? (
                (catalogo?.promociones.length ?? 0) === 0 ? (
                  <p className="text-sm text-ink-soft">Todavía no hay ninguna promo cargada.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {catalogo!.promociones.map((promo) =>
                      esPaquete(promo) ? (
                        // Paquete: una fila con nombre, precio y el desglose de lo
                        // que lleva. Se toca y queda elegida entera.
                        <li key={promo.id}>
                          <button
                            className={
                              paqueteElegido?.id === promo.id
                                ? "flex w-full flex-col gap-1 rounded border border-primary bg-surface-high px-3 py-2 text-left text-sm"
                                : "flex w-full flex-col gap-1 rounded border border-transparent px-3 py-2 text-left text-sm hover:bg-surface-high"
                            }
                            onClick={() => elegirPaquete(promo)}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-ink">{promo.name ?? "Sin nombre"}</span>
                              <span className="shrink-0 text-xs text-ink-soft">
                                {pesos(promo.precioDelPaquete ?? 0)}
                              </span>
                            </span>
                            <ul className="pl-3 text-xs text-ink-soft">
                              {desgloseDePromo(promo.destinos, catalogo!).map((fila, i) => (
                                <li key={i}>
                                  {fila.cantidad} × {fila.nombre}
                                </li>
                              ))}
                            </ul>
                          </button>
                        </li>
                      ) : (
                        // Descuento: se despliega y muestra sus items. Se toca UN
                        // item y queda elegido ESE, con la promo ya puesta — el
                        // comportamiento de hoy, ahora encontrable desde acá.
                        <li key={promo.id}>
                          <button
                            className="flex w-full items-center justify-between gap-3 rounded border border-transparent px-3 py-2 text-left text-sm hover:bg-surface-high"
                            onClick={() =>
                              setPromoDesplegada(promoDesplegada === promo.id ? null : promo.id)
                            }
                          >
                            <span className="text-ink">{promo.name ?? "Sin nombre"}</span>
                          </button>
                          {promoDesplegada === promo.id && (
                            <ul className="pl-3">
                              {desgloseDePromo(promo.destinos, catalogo!).map((fila, i) => {
                                const destino = promo.destinos[i];
                                const item = destino ? itemsPorId.get(destino.id) : undefined;
                                return (
                                  <li key={i}>
                                    <button
                                      className="w-full rounded px-2 py-1 text-left text-xs text-ink hover:bg-surface-high"
                                      disabled={!item}
                                      onClick={() => item && elegirItemDePromo(promo, item)}
                                    >
                                      {fila.nombre}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                )
              ) : lista.length === 0 ? (
                // Se distingue "no hay ninguno cargado" de "el buscador no
                // encontró": son dos problemas con soluciones distintas.
                <p className="text-sm text-ink-soft">
                  {busqueda.trim()
                    ? "Nada que coincida con la búsqueda."
                    : "Todavía no hay ninguno cargado en el catálogo."}
                </p>
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
            {!elegido && !paqueteElegido ? (
              <p className="text-sm text-ink-soft">Elegí qué le vas a vender.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-ink">
                  {elegido ? elegido.nombre : paqueteElegido!.name}
                </p>

                {/* Un paquete es SIEMPRE una sola compra: no hay sesiones que
                    elegir. */}
                {!paqueteElegido && (
                  <label className="block text-sm">
                    <span className="text-ink-soft">Sesiones</span>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
                      value={sesiones}
                      // Un combo YA es el paquete, y una capacitación se vende
                      // entera: el precio de catálogo es el del curso completo.
                      disabled={elegido?.origen === "combo" || elegido?.origen === "capacitacion"}
                      onChange={(e) => setSesiones(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </label>
                )}

                {conDescuentoDePack && (
                  <p className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Pack de {elegido?.packSesiones}
                    {elegido?.packDescuentoPct ? ` — ${elegido.packDescuentoPct}% de descuento` : ""}.
                  </p>
                )}
                {avisaFaltaDePack && (
                  <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    El pack es de {elegido?.packSesiones} sesiones. Con {sesiones} se venden al
                    precio de lista, sin descuento.
                  </p>
                )}

                {/* Sólo si hay promos vigentes. Un desplegable con una única
                    opción que dice "Sin promo" no informa nada y hace dudar de
                    para qué está. */}
                {promosDisponibles.length > 0 && (
                  <label className="block text-sm">
                    <span className="text-ink-soft">Promo</span>
                    <select
                      className="mt-1 w-full rounded border border-surface-highest bg-surface-low px-3 py-2 text-sm"
                      value={promotionId ?? ""}
                      onChange={(e) => setPromotionId(e.target.value || null)}
                    >
                      <option value="">Sin promo</option>
                      {promosDisponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name ?? "Sin nombre"}
                        </option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      Descuento extra, encima del precio del pack.
                    </span>
                  </label>
                )}

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

                      {/* El saldo a favor va DESPUÉS del total y no antes: no
                          es un descuento, es plata de la clienta que ya está
                          en la casa. Mezclarlo con las capas de precio haría
                          creer que el pack salió más barato. */}
                      {saldoAFavor > 0 && (
                        <div className="mt-2 border-t border-surface-highest pt-2">
                          <label className="flex items-start gap-2 text-xs">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={usarSaldo}
                              onChange={(e) => setUsarSaldo(e.target.checked)}
                            />
                            <span>
                              Usar el <strong>saldo a favor</strong> de {pesos(saldoAFavor)}
                            </span>
                          </label>
                          {usarSaldo && (
                            <dl className="mt-1 flex flex-col gap-1">
                              <div className="flex justify-between">
                                <dt className="text-ink-soft">Con saldo a favor</dt>
                                <dd>−{pesos(conSaldo)}</dd>
                              </div>
                              <div className="flex justify-between font-semibold text-ink">
                                <dt>{restaPagar === 0 ? "Queda paga" : "Resta cobrar"}</dt>
                                <dd>{pesos(restaPagar)}</dd>
                              </div>
                              {saldoAFavor > conSaldo && (
                                <p className="text-xs text-ink-soft">
                                  Le quedan {pesos(saldoAFavor - conSaldo)} a favor.
                                </p>
                              )}
                            </dl>
                          )}
                        </div>
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
