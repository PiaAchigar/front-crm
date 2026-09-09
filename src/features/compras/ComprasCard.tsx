import { useState } from "react";
import type { Compra } from "../../api/compras";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatDateTime, formatDateTimeToDate } from "../../lib/format";
import {
  ahorro,
  estadoDeCompra,
  etiquetaDeSesion,
  pesos,
  progresoDeSesiones,
} from "../../lib/compras-ui";
import {
  useCancelarCompra,
  useCompras,
  useEliminarCompra,
  useImpactoDeBorrado,
} from "./useCompras";
import { VenderModal } from "./VenderModal";

/**
 * "Compras del Cliente" — lo que la clienta adquirió y en qué anda.
 *
 * Todo lo que se ve acá es DERIVADO: cuántas sesiones quedan sale del estado de
 * los turnos, y el saldo de los pagos confirmados. No hay ningún número
 * guardado que pueda desincronizarse, así que cancelar un turno devuelve la
 * sesión a disponible sin que esta pantalla tenga que hacer nada.
 *
 * Por ahora muestra packs, combos y servicios vendidos por adelantado. El
 * timeline completo —compras sueltas, asistencia, reagendamientos— es V4.
 */
export function ComprasCard({ customerId }: { customerId: string }) {
  const { data: compras, isLoading, isError } = useCompras(customerId);
  const [vendiendo, setVendiendo] = useState(false);

  return (
    <section className="rounded-xl border border-surface-high bg-surface-low p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Compras del Cliente
        </h2>
        <button
          className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
          onClick={() => setVendiendo(true)}
        >
          Vender
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : isError ? (
        <p className="text-sm text-ink-soft">No pudimos cargar las compras.</p>
      ) : !compras?.length ? (
        <p className="text-sm text-ink-soft">
          Todavía no compró nada. Los packs, combos y servicios que pague por adelantado van a
          aparecer acá.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {compras.map((c) => (
            <FilaDeCompra key={c.id} compra={c} customerId={customerId} />
          ))}
        </ul>
      )}

      {vendiendo && <VenderModal customerId={customerId} onClose={() => setVendiendo(false)} />}
    </section>
  );
}

function FilaDeCompra({ compra, customerId }: { compra: Compra; customerId: string }) {
  const [abierta, setAbierta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const cancelar = useCancelarCompra(customerId);

  const estado = estadoDeCompra(compra);
  const progreso = progresoDeSesiones(compra);
  const ahorrado = ahorro(compra);
  const cancelada = !!compra.cancelledAt;

  return (
    <li
      className={`rounded-lg border border-surface-high p-3 ${cancelada ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-medium text-ink ${cancelada ? "line-through" : ""}`}>
            {compra.description ?? "Sin descripción"}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatDateTimeToDate(compra.purchasedAt)}
            {compra.promotionName ? ` · Promo: ${compra.promotionName}` : ""}
            {compra.expiresAt ? ` · Vence ${formatDateTimeToDate(compra.expiresAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${estado.clase}`}>{estado.texto}</span>
          <span className="text-sm font-semibold text-ink">{pesos(compra.finalAmount)}</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span>{progreso.texto}</span>
        {compra.agendadas > 0 && <span>{compra.agendadas} agendada{compra.agendadas > 1 ? "s" : ""}</span>}
        {compra.disponibles > 0 && <span>{compra.disponibles} sin usar</span>}
        <span>
          Pagado {pesos(compra.pagado)} de {pesos(compra.finalAmount)}
        </span>
        {ahorrado > 0 && <span className="text-emerald-700">Ahorra {pesos(ahorrado)}</span>}
      </div>

      {/* La barra mide lo CONSUMIDO. Una sesión agendada todavía puede
          cancelarse, y si contara acá la barra retrocedería. */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-high">
        <div className="h-full bg-primary" style={{ width: `${progreso.porcentaje}%` }} />
      </div>

      <div className="mt-2 flex gap-3 text-xs">
        <button className="text-primary hover:underline" onClick={() => setAbierta((v) => !v)}>
          {abierta ? "Ocultar sesiones" : "Ver sesiones"}
        </button>
        {!cancelada && (
          <button className="text-ink-soft hover:underline" onClick={() => setConfirmando(true)}>
            Cancelar compra
          </button>
        )}
        {/* Eliminar también se ofrece sobre una compra cancelada: cancelar por
            error y querer limpiarlo es el mismo caso — no pasó nada. */}
        <button className="text-ink-soft hover:underline" onClick={() => setBorrando(true)}>
          Eliminar
        </button>
      </div>

      {abierta && (
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1">#</th>
              <th className="py-1">Estado</th>
              <th className="py-1">Turno</th>
            </tr>
          </thead>
          <tbody>
            {compra.sessions.map((s) => {
              const e = etiquetaDeSesion(s.estado);
              return (
                <tr key={s.id} className="border-t border-surface-high">
                  <td className="py-1">{s.sessionNumber ?? "—"}</td>
                  <td className="py-1">
                    <span className={`rounded-full px-2 py-0.5 ${e.clase}`}>{e.texto}</span>
                  </td>
                  <td className="py-1">
                    {s.appointmentStart ? formatDateTime(s.appointmentStart) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {borrando && (
        <EliminarCompraDialog
          compra={compra}
          customerId={customerId}
          onClose={() => setBorrando(false)}
          onCancelarEnSuLugar={() => {
            setBorrando(false);
            setConfirmando(true);
          }}
        />
      )}

      {confirmando && (
        <ConfirmDialog
          title={`¿Cancelar "${compra.description ?? "esta compra"}"?`}
          description="La compra no se borra: queda en la ficha, cancelada."
          points={[
            "Las sesiones que todavía no se usaron pasan a vencidas y no se pueden agendar.",
            "Lo ya consumido no se toca: se hizo cuando la compra estaba vigente.",
            "Los pagos y las facturas que tenga siguen existiendo — devolver plata es aparte.",
          ]}
          confirmLabel="Cancelar la compra"
          pendingLabel="Cancelando…"
          cancelLabel="Volver"
          tone="danger"
          isPending={cancelar.isPending}
          error={cancelar.error ? (cancelar.error as Error).message : null}
          onConfirm={() =>
            cancelar.mutate({ id: compra.id }, { onSuccess: () => setConfirmando(false) })
          }
          onClose={() => setConfirmando(false)}
        />
      )}
    </li>
  );
}

/**
 * El cartel de eliminar, que en realidad son dos.
 *
 * Antes de ofrecer nada le pregunta al backend qué cuelga de la compra. Si no
 * cuelga nada, ofrece borrarla para siempre. Si cuelga algo, **no ofrece
 * borrar**: explica qué lo impide y ofrece lo único que sí se puede hacer, que
 * es cancelarla. Mostrar un botón que el backend va a rechazar sería mandar a
 * Laura contra una pared.
 */
function EliminarCompraDialog({
  compra,
  customerId,
  onClose,
  onCancelarEnSuLugar,
}: {
  compra: Compra;
  customerId: string;
  onClose: () => void;
  onCancelarEnSuLugar: () => void;
}) {
  const { data: impacto, isLoading } = useImpactoDeBorrado(compra.id);
  const eliminar = useEliminarCompra(customerId);
  const nombre = compra.description ?? "esta compra";

  if (isLoading || !impacto) {
    return (
      <ConfirmDialog
        title="Revisando si se puede eliminar…"
        description="Estamos viendo si tiene pagos, facturas o turnos."
        confirmLabel="Esperá"
        isPending
        onConfirm={() => {}}
        onClose={onClose}
      />
    );
  }

  if (!impacto.borrable) {
    return (
      <ConfirmDialog
        title={`No se puede eliminar "${nombre}"`}
        description="Algo ya depende de esta compra, así que borrarla dejaría datos apuntando a algo que no existe. Lo que sí podés hacer es cancelarla: queda en la ficha, dada de baja."
        points={impacto.motivos}
        confirmLabel="Cancelar la compra"
        cancelLabel="Volver"
        onConfirm={onCancelarEnSuLugar}
        onClose={onClose}
      />
    );
  }

  return (
    <ConfirmDialog
      title={`¿Eliminar "${nombre}" para siempre?`}
      description="Esto es para una venta cargada por error. No va a quedar registro de que existió."
      points={[
        "No tiene pagos, ni facturas, ni sesiones agendadas o consumidas: no se pierde nada.",
        "Se borra junto con sus sesiones sin usar.",
        "Si en cambio la clienta compró de verdad y se dio de baja, cerrá esto y usá 'Cancelar compra': eso deja el registro.",
      ]}
      confirmLabel="Eliminar para siempre"
      pendingLabel="Eliminando…"
      cancelLabel="Volver"
      tone="danger"
      isPending={eliminar.isPending}
      error={eliminar.error ? (eliminar.error as Error).message : null}
      onConfirm={() => eliminar.mutate(compra.id, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
