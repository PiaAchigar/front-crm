import { useEffect, useMemo, useState } from "react";
import type {
  ItemDeCatalogo,
  OrigenVenta,
  PromoVendible,
} from "../../api/compras";
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

/**
 * Las cinco solapas, en el orden en que Laura las recorre.
 *
 * "Combos / Packs" junta los combos y los packs de las áreas de estética,
 * medicina y masajes. La depilación definitiva va aparte —tiene su propio
 * catálogo de zonas y su propia forma de cotizar— y por eso tiene solapa
 * propia, aunque también se llamen "packs".
 */
const SOLAPAS: { clave: SolapaClave; titulo: string }[] = [
  { clave: "depilacion", titulo: "Pack/Combos Depi Def" },
  { clave: "combos", titulo: "Combos / Packs" },
  { clave: "servicios", titulo: "Servicios" },
  { clave: "capacitaciones", titulo: "Capacitaciones" },
  { clave: "promos", titulo: "Promos" },
];

/** Un combo o pack se cotiza SIEMPRE con una sola repetición: sus sesiones ya
 *  están adentro, en sus líneas, y el precio ya viene multiplicado. */
const SESIONES_FIJAS_EN_UNO: OrigenVenta[] = ["combo", "capacitacion"];

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
  sexo = null,
  onClose,
}: {
  customerId: string;
  /** Saldo a favor de la clienta. Lo primero que se le ofrece antes de cobrar. */
  saldoAFavor: number;
  /** El sexo de la clienta (ficha del contacto). NULL/ausente = mujer, igual
   *  que resuelve el backend: sólo se usa acá para avisar en pantalla cuándo
   *  se está cotizando en tarifa de hombre. */
  sexo?: "mujer" | "hombre" | null;
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
  const [paqueteElegido, setPaqueteElegido] = useState<PromoVendible | null>(
    null,
  );
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
    origen: paqueteElegido
      ? "paquete"
      : ((elegido?.origen ?? null) as OrigenVenta | null),
    id: elegido?.id ?? null,
    sessions: sesiones,
    promotionId: paqueteElegido ? paqueteElegido.id : promotionId,
    customerId,
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

  // El mismo buscador filtra las promos por nombre cuando la solapa activa es
  // "Promos". Dejarlo ahí sin hacer nada repetiría en chiquito el problema que
  // originó esta tarea: Laura escribe "promo" y no pasa nada.
  const promosFiltradas = useMemo(() => {
    const proms = catalogo?.promociones ?? [];
    const q = busqueda.trim().toLowerCase();
    return q
      ? proms.filter((p) => (p.name ?? "").toLowerCase().includes(q))
      : proms;
  }, [catalogo, busqueda]);

  // Un catálogo "seguro": cada lista cae a `[]` si esa clave no vino, en vez
  // de romper. Un `?.` en `catalogo?.algo` sólo cubre que `catalogo` sea
  // nullish — no que le falte una clave puntual (`catalogo` presente pero sin
  // `servicios`, por ejemplo), y ESE es el caso que ya mordió dos veces:
  // primero con `capacitaciones` acá abajo, después con `promociones` en
  // `promosDisponibles` (`catalogo?.promociones.filter(...)` explotaba antes
  // de llegar al `?? []` si faltaba la clave, y como este `useMemo` corre en
  // cada render —no sólo en la solapa Promos— tumbaba el modal entero).
  const catalogoSeguro = useMemo(
    () => ({
      servicios: catalogo?.servicios ?? [],
      combos: catalogo?.combos ?? [],
      depilacion: catalogo?.depilacion ?? [],
      capacitaciones: catalogo?.capacitaciones ?? [],
    }),
    [catalogo],
  );

  // Todo lo vendible, indexado por id, para resolver a qué item apunta cada
  // destino de una promo de descuento (la solapa Promos no vuelve a pedirle
  // nada al backend: usa el catálogo que el modal ya tiene cargado).
  const itemsPorId = useMemo(() => {
    const m = new Map<string, ItemDeCatalogo>();
    for (const l of [
      catalogoSeguro.servicios,
      catalogoSeguro.combos,
      catalogoSeguro.depilacion,
      catalogoSeguro.capacitaciones,
    ]) {
      for (const it of l) m.set(it.id, it);
    }
    return m;
  }, [catalogoSeguro]);

  // Sólo las promos que sirven para lo elegido. Antes se listaban todas y se
  // le podía aplicar a un Baby Botox una promo pensada para depilación.
  //
  // Un PAQUETE queda afuera de este desplegable aunque sus destinos coincidan
  // con lo elegido: sus destinos son lo que lleva adentro, no "a qué le
  // aplica un descuento". Un paquete no tiene `discountPercentage` ni
  // `discountAmount`, así que si se colara acá el backend lo aceptaría sin
  // bajar el precio y de paso le gastaría una unidad de cupo a la promo —
  // silencioso de los dos lados. Se vende SOLO desde la solapa Promos.
  const promosDisponibles = useMemo(
    () =>
      promosQueAplican(
        (catalogo?.promociones ?? []).filter((p) => !esPaquete(p)),
        elegido,
      ),
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
    //
    // **Salvo en un combo o pack de catálogo, que van SIEMPRE en 1.** Sus
    // sesiones ya están adentro de sus líneas y el precio ya viene
    // multiplicado (`conPrecioDePack`), así que pedir 3 sería cobrar 9 —
    // `cotizar` lo rechaza con "Un combo se vende de a uno". Mandarlas acá
    // hacía fallar la cotización de TODO pack y dejaba "Vender" apagado:
    // ningún pack del catálogo se podía vender desde el CRM (reportado por
    // Pia sobre "Pack 1 - Prueba", 2026-09-23).
    setSesiones(
      SESIONES_FIJAS_EN_UNO.includes(item.origen)
        ? 1
        : (item.packSesiones ?? 1),
    );
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
  /** Un combo o pack de catálogo se vende con 1 repetición y el descuento del
   *  pack ya viene adentro del precio: comparar contra `sesiones` lo daba
   *  siempre por falso y escondía el "Pack de 3" justo donde más se necesita. */
  const conDescuentoDePack =
    elegido?.origen === "combo"
      ? !!elegido.packSesiones
      : !!elegido?.packSesiones && sesiones === elegido.packSesiones;
  const sinDescuento = !!q && q.discountedAmount >= q.baseAmount;

  // El aviso de "sin descuento" SÓLO cuando de verdad se está perdiendo algo.
  //
  // Antes salía siempre que las sesiones no fueran las del pack, y eso incluía
  // el caso más común de todos: vender UN servicio suelto. Decirle a Laura
  // "sin el descuento del pack" cada vez que vende un lifting de pestañas es
  // ruido sobre la operación normal.
  const avisaFaltaDePack =
    !!elegido?.packSesiones && sesiones > 1 && !conDescuentoDePack;

  /** Dónde tiene sentido preguntar "cuántas": un combo y una capacitación se
   *  venden enteros, así que el campo estaba ahí sólo para estar gris. */
  const eligeSesiones =
    !paqueteElegido &&
    !!elegido &&
    !SESIONES_FIJAS_EN_UNO.includes(elegido.origen);
  /**
   * Qué trae lo que está elegido, sea item suelto o paquete.
   *
   * Las dos fuentes son distintas y las dos ya están en memoria: un item trae
   * su desglose en el catálogo; un paquete lo arma resolviendo sus destinos
   * contra ese mismo catálogo. Ninguna de las dos le pide nada al backend.
   */
  const desglose = paqueteElegido
    ? desgloseDePromo(paqueteElegido.destinos, catalogoSeguro)
    : (elegido?.desglose ?? []);

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
      {/* `max-w-5xl` y no `3xl`: con la columna de la derecha en 20rem sobre un
          modal de 48rem, el panel de precios quedaba en 17rem útiles y el
          contenido se comía su propio padding. Ahora la lista respira y el
          panel entra entero sin cortarse. */}
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-surface-low shadow-2xl shadow-ink/20">
        <div className="border-b border-surface-high px-6 py-5">
          <h2 className="text-xl font-semibold text-ink">
            Vender a la clienta
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            El precio se congela al vender: si mañana cambia el catálogo, esta
            compra no se mueve.
          </p>
        </div>

        {/* Alto FIJO y no `flex-1`: con el alto adaptado al contenido, el modal
            pegaba un salto al cambiar de solapa —3 packs contra 120
            servicios— y los botones se movían de lugar debajo del cursor. */}
        <div className="grid h-[30rem] grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_24rem]">
          {/* Elegir qué */}
          <div className="flex min-h-0 flex-col border-r border-surface-high p-5">
            {/* `flex-wrap`: cinco solapas con nombres largos no entran en una
                línea, y sin esto la última se salía del modal. */}
            <div role="tablist" className="mb-4 flex flex-wrap gap-1.5">
              {SOLAPAS.map((s) => (
                <button
                  key={s.clave}
                  role="tab"
                  aria-selected={solapa === s.clave}
                  className={
                    solapa === s.clave
                      ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-full border border-surface-highest px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-surface-high hover:text-ink"
                  }
                  onClick={() => setSolapa(s.clave)}
                >
                  {s.titulo}
                </button>
              ))}
            </div>

            <input
              className="mb-3 w-full rounded-lg border border-surface-highest bg-surface-low px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-soft/70 focus:border-primary"
              placeholder="Buscar…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-ink-soft">Cargando el catálogo…</p>
              ) : solapa === "promos" ? (
                promosFiltradas.length === 0 ? (
                  // Se distingue "no hay ninguna cargada" de "el buscador no
                  // encontró", igual que en las otras solapas.
                  <p className="text-sm text-ink-soft">
                    {busqueda.trim()
                      ? "Nada que coincida con la búsqueda."
                      : "Todavía no hay ninguna promo cargada."}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {promosFiltradas.map((promo) =>
                      esPaquete(promo) ? (
                        // Paquete: una fila con nombre, precio y el desglose de lo
                        // que lleva. Se toca y queda elegida entera.
                        //
                        // El `<ul>` del desglose va AFUERA del `<button>` (como
                        // hermano, en un `role="group"` que los agrupa): un
                        // <button> sólo admite contenido de frase, y meterle una
                        // lista adentro dejaba el nombre accesible del botón como
                        // "Promo Novia $250.000 3 × Limpieza de cutis".
                        <li key={promo.id}>
                          <div
                            role="group"
                            aria-label={promo.name ?? "Sin nombre"}
                            className={
                              paqueteElegido?.id === promo.id
                                ? "flex flex-col gap-1 rounded border border-primary bg-surface-high px-3 py-2 text-sm"
                                : "flex flex-col gap-1 rounded border border-transparent px-3 py-2 text-sm hover:bg-surface-high"
                            }
                          >
                            <button
                              className="flex w-full items-center justify-between gap-3 text-left"
                              onClick={() => elegirPaquete(promo)}
                            >
                              <span className="text-ink">
                                {promo.name ?? "Sin nombre"}
                              </span>
                              <span className="shrink-0 text-xs text-ink-soft">
                                {promo.precioDelPaquete &&
                                promo.precioDelPaquete > 0
                                  ? pesos(promo.precioDelPaquete)
                                  : "sin precio"}
                              </span>
                            </button>
                            <ul className="pl-3 text-xs text-ink-soft">
                              {desgloseDePromo(
                                promo.destinos,
                                catalogoSeguro,
                              ).map((fila, i) => (
                                <li key={i}>
                                  {fila.cantidad} × {fila.nombre}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </li>
                      ) : (
                        // Descuento: se despliega y muestra sus items. Se toca UN
                        // item y queda elegido ESE, con la promo ya puesta — el
                        // comportamiento de hoy, ahora encontrable desde acá.
                        <li key={promo.id}>
                          <button
                            className="flex w-full items-center justify-between gap-3 rounded border border-transparent px-3 py-2 text-left text-sm hover:bg-surface-high"
                            onClick={() =>
                              setPromoDesplegada(
                                promoDesplegada === promo.id ? null : promo.id,
                              )
                            }
                          >
                            <span className="text-ink">
                              {promo.name ?? "Sin nombre"}
                            </span>
                          </button>
                          {promoDesplegada === promo.id && (
                            <ul className="pl-3">
                              {desgloseDePromo(
                                promo.destinos,
                                catalogoSeguro,
                              ).map((fila, i) => {
                                const destino = promo.destinos[i];
                                const item = destino
                                  ? itemsPorId.get(destino.id)
                                  : undefined;
                                return (
                                  <li key={i}>
                                    <button
                                      className="w-full rounded px-2 py-1 text-left text-xs text-ink hover:bg-surface-high"
                                      disabled={!item}
                                      onClick={() =>
                                        item && elegirItemDePromo(promo, item)
                                      }
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
                          elegido?.id === item.id &&
                          elegido.origen === item.origen
                            ? "flex w-full items-center justify-between gap-3 rounded border border-primary bg-surface-high px-3 py-2 text-left text-sm"
                            : "flex w-full items-center justify-between gap-3 rounded border border-transparent px-3 py-2 text-left text-sm hover:bg-surface-high"
                        }
                        onClick={() => elegir(item)}
                      >
                        <span className="text-ink">{item.nombre}</span>
                        <span className="shrink-0 text-xs text-ink-soft">
                          {item.precioDesde > 0
                            ? pesos(item.precioDesde)
                            : "sin precio"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Cuánto sale */}
          {/* El panel NO scrollea entero: scrollea sólo la parte de arriba, y
              el bloque de precios queda fijo al pie. Con todo en un mismo
              scroll, un pack de depilación de 10 zonas empujaba el total
              abajo del borde — el número que Laura tiene que leer antes de
              cobrar quedaba fuera de la vista. */}
          <div className="flex min-h-0 flex-col p-5">
            {!elegido && !paqueteElegido ? (
              // El vacío enseña la pantalla en vez de constatar que está
              // vacía: dice qué hacer y qué va a pasar cuando se haga.
              <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                <p className="text-sm font-medium text-ink">
                  Elegí qué le vas a vender
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Tocá algo de la lista y acá te digo qué trae y cuánto sale.
                </p>
              </div>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
                  <div>
                    <p className="text-base leading-snug font-semibold text-ink">
                      {elegido ? elegido.nombre : paqueteElegido!.name}
                    </p>
                    {elegido?.descripcion && (
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                        {elegido.descripcion}
                      </p>
                    )}
                    {/* Una pastilla y no un recuadro a todo lo ancho: que un
                      pack traiga 3 sesiones es un DATO del item, no un aviso.
                      El recuadro verde competía con el bloque de precios, que
                      es lo que Laura tiene que leer antes de cobrar. */}
                    {conDescuentoDePack && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                        Pack de {elegido?.packSesiones}
                        {elegido?.packDescuentoPct
                          ? ` · ${elegido.packDescuentoPct}% off`
                          : ""}
                      </span>
                    )}
                    {/* Sólo depilación cobra distinto según a quién se le
                      vende. Sin este aviso Laura ve un número más alto que el
                      del listado (que siempre muestra el precio de mujer) y
                      no tiene cómo saber por qué. En mujer no se dice nada a
                      propósito: sería ruido en el caso normal, que es la
                      enorme mayoría. */}
                    {elegido?.origen === "depilacion" && sexo === "hombre" && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-surface-high px-2.5 py-1 text-xs text-ink-soft">
                        Tarifa de hombre
                      </span>
                    )}
                  </div>

                  {/* Sólo donde de verdad hay algo que elegir. Un combo y una
                    capacitación se venden enteros, así que el campo estaba
                    ahí nada más que para estar gris. */}
                  {eligeSesiones && (
                    <label className="block text-sm">
                      <span className="text-ink-soft">Sesiones</span>
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-surface-highest bg-surface-low px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-primary"
                        value={sesiones}
                        onChange={(e) =>
                          setSesiones(Math.max(1, Number(e.target.value) || 1))
                        }
                      />
                    </label>
                  )}

                  {avisaFaltaDePack && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      El pack es de {elegido?.packSesiones} sesiones. Con{" "}
                      {sesiones} se venden al precio de lista, sin descuento.
                    </p>
                  )}

                  {/* Sólo si hay promos vigentes. Un desplegable con una única
                    opción que dice "Sin promo" no informa nada y hace dudar de
                    para qué está. */}
                  {promosDisponibles.length > 0 && (
                    <label className="block text-sm">
                      <span className="text-ink-soft">Promo</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-surface-highest bg-surface-low px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
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

                  {/* Qué trae. El nombre solo no alcanza: "Pack 1 - Prueba" y
                    "Cuerpo Full" no dicen qué se lleva la clienta, y Laura
                    tenía que abrir el dashboard en otra pestaña para saberlo. */}
                  {desglose.length > 0 && (
                    // `aria-labelledby` y no sólo el `<h3>`: un `<section>` sin
                    // nombre accesible no expone el rol `region`, así que el
                    // bloque quedaba invisible para un lector de pantalla —y
                    // para los tests— aunque el título estuviera dibujado.
                    <section aria-labelledby="vender-que-trae">
                      <h3
                        id="vender-que-trae"
                        className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-ink-soft uppercase"
                      >
                        Qué trae
                      </h3>
                      {/* Lista pelada, sin marco. Con la caja, un desglose
                        más alto que el panel se cortaba junto con su propio
                        borde y parecía terminar ahí: "Cuerpo Full" se leía
                        como 4 zonas cuando trae 10. Una lista cortada se lee
                        como lo que es, algo que sigue. Y de paso deja de ser
                        una tarjeta adentro de otra. */}
                      <ul className="flex flex-col gap-1.5">
                        {desglose.map((fila, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            {/* La cantidad sólo cuando dice algo. Un pack de
                              depilación son 10 zonas de a una: diez "1×"
                              seguidos son ruido, y de paso le sacan fuerza al
                              "3×" de un pack, que sí es información. La
                              columna queda igual de ancha para que los
                              nombres sigan alineados. */}
                            <span className="flex w-6 shrink-0 justify-end pt-[0.3rem]">
                              {fila.cantidad > 1 ? (
                                <span className="text-xs leading-none font-semibold text-primary tabular-nums">
                                  {fila.cantidad}×
                                </span>
                              ) : (
                                <span
                                  className="size-1 rounded-full bg-ink-soft/40"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1 leading-snug text-ink">
                              {fila.nombre}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <label className="block text-sm">
                    <span className="text-ink-soft">Nota</span>
                    <textarea
                      className="mt-1 w-full resize-none rounded-lg border border-surface-highest bg-surface-low px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-ink-soft/70 focus:border-primary"
                      rows={2}
                      placeholder="Algo para recordar de esta venta…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </div>

                {/* Fuera del scroll: la plata es lo último que Laura mira
                    antes de apretar Vender, así que no se va de la vista por
                    mucho que traiga el combo. */}
                <div className="mt-4 shrink-0">
                  <div className="rounded-lg border border-surface-high bg-surface-high/40 p-3.5 text-sm">
                    {cotizacion.isError ? (
                      <p className="text-rose-700">
                        {(cotizacion.error as Error).message}
                      </p>
                    ) : !q ? (
                      <p className="text-ink-soft">Calculando…</p>
                    ) : (
                      <dl className="flex flex-col gap-1">
                        <div className="flex justify-between gap-3">
                          {/* En un pack la lista NO es "el precio de lista" a
                            secas: es lo que costarían sus N sesiones compradas
                            de a una. Decirlo así es lo que hace entender el
                            ahorro de abajo. */}
                          <dt className="text-ink-soft">
                            {conDescuentoDePack && q.sessionsTotal > 1
                              ? `Sueltas (${q.sessionsTotal} sesiones)`
                              : "Precio de lista"}
                          </dt>
                          <dd
                            className={
                              sinDescuento
                                ? "tabular-nums"
                                : "text-ink-soft line-through tabular-nums"
                            }
                          >
                            {pesos(q.baseAmount)}
                          </dd>
                        </div>
                        {!sinDescuento && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-ink-soft">Con el pack</dt>
                            <dd className="tabular-nums">
                              {pesos(q.discountedAmount)}
                            </dd>
                          </div>
                        )}
                        {q.finalAmount !== q.discountedAmount && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-ink-soft">Con la promo</dt>
                            <dd className="tabular-nums">
                              {pesos(q.finalAmount)}
                            </dd>
                          </div>
                        )}
                        <div className="mt-1.5 flex justify-between gap-3 border-t border-surface-highest pt-2 text-base font-semibold text-ink">
                          <dt>Total</dt>
                          <dd className="tabular-nums">
                            {pesos(q.finalAmount)}
                          </dd>
                        </div>
                        {q.baseAmount > q.finalAmount && (
                          <p className="text-xs font-medium text-emerald-700">
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
                                Usar el <strong>saldo a favor</strong> de{" "}
                                {pesos(saldoAFavor)}
                              </span>
                            </label>
                            {usarSaldo && (
                              <dl className="mt-1 flex flex-col gap-1">
                                <div className="flex justify-between">
                                  <dt className="text-ink-soft">
                                    Con saldo a favor
                                  </dt>
                                  <dd>−{pesos(conSaldo)}</dd>
                                </div>
                                <div className="flex justify-between font-semibold text-ink">
                                  <dt>
                                    {restaPagar === 0
                                      ? "Queda paga"
                                      : "Resta cobrar"}
                                  </dt>
                                  <dd>{pesos(restaPagar)}</dd>
                                </div>
                                {saldoAFavor > conSaldo && (
                                  <p className="text-xs text-ink-soft">
                                    Le quedan {pesos(saldoAFavor - conSaldo)} a
                                    favor.
                                  </p>
                                )}
                              </dl>
                            )}
                          </div>
                        )}
                      </dl>
                    )}
                  </div>
                </div>
              </>
            )}

            {vender.error && (
              <p className="text-sm text-rose-700">
                {(vender.error as Error).message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-high px-6 py-4">
          <button
            className="rounded-full border border-surface-highest px-5 py-2 text-sm text-ink-soft transition-colors hover:bg-surface-high hover:text-ink disabled:opacity-40"
            onClick={onClose}
            disabled={vender.isPending}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
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
