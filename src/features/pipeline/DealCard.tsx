import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import type { Agent, Deal } from "../../api/deals";
import { useAssignDeal, useCancelDeal, useUpdateDealTitle } from "./usePipeline";

export function DealCard({ deal, agents }: { deal: Deal; agents: Agent[] }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const assign = useAssignDeal();
  const cancel = useCancelDeal();
  const rename = useUpdateDealTitle();
  const [cancelling, setCancelling] = useState(false);
  const [renaming, setRenaming] = useState(false);

  // Deal cancelado: card estática (sin drag, sin acciones), griseada + badge.
  if (deal.cancelled) {
    return (
      <div className="rounded-lg border border-surface-highest bg-surface-container p-3 text-sm opacity-60">
        <p className="font-medium">{deal.contactName ?? "Sin contacto"}</p>
        <p className="text-ink-soft">{deal.serviceName ?? deal.title}</p>
        <span className="mt-1 inline-block rounded-full bg-surface-high px-2 py-0.5 text-xs text-ink-soft">
          Cancelado{deal.cancelReason ? `: ${deal.cancelReason}` : ""}
        </span>
      </div>
    );
  }

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="cursor-grab rounded-lg border border-surface-highest bg-surface-low p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <p className="font-medium">{deal.contactName ?? "Sin contacto"}</p>
      <p className="text-ink-soft">{deal.serviceName ?? deal.title}</p>
      {deal.seniaAmount && <p className="text-ink-soft">Seña: ${deal.seniaAmount}</p>}

      <select
        className="mt-2 w-full rounded border border-surface-highest bg-surface px-2 py-1 text-xs"
        value={deal.assignedAgentId ?? ""}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => assign.mutate({ id: deal.id, assignedAgentId: e.target.value || null })}
      >
        <option value="">Sin asignar</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.fullName ?? a.email}
          </option>
        ))}
      </select>

      <div className="mt-2 flex gap-3">
        <button
          className="text-xs text-primary hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            rename.reset();
            setRenaming(true);
          }}
        >
          Editar
        </button>
        <button
          className="text-xs text-red-700 hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            cancel.reset();
            setCancelling(true);
          }}
        >
          Cancelar
        </button>
      </div>

      {renaming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-xl bg-surface-low p-4 shadow-xl">
            <p className="mb-3 text-sm">Editar título del deal</p>
            <input
              id={`rename-${deal.id}`}
              defaultValue={deal.title ?? ""}
              className="w-full rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              placeholder="Título"
            />
            {rename.isError && (
              <p className="mt-2 text-xs text-red-700">{rename.error.message}</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="rounded-full px-3 py-1.5 text-sm text-ink-soft"
                onClick={() => {
                  rename.reset();
                  setRenaming(false);
                }}
              >
                Volver
              </button>
              <button
                className="rounded-full bg-primary px-3 py-1.5 text-sm text-white"
                onClick={() => {
                  const input = document.getElementById(`rename-${deal.id}`) as HTMLInputElement;
                  const value = input.value.trim();
                  if (!value) return;
                  rename.mutate({ id: deal.id, title: value }, { onSuccess: () => setRenaming(false) });
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelling && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-xl bg-surface-low p-4 shadow-xl">
            <p className="mb-3 text-sm">¿Motivo de cancelación?</p>
            <input
              id={`cancel-reason-${deal.id}`}
              className="w-full rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              placeholder="Motivo"
            />
            {cancel.isError && <p className="mt-2 text-xs text-red-700">{cancel.error.message}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="rounded-full px-3 py-1.5 text-sm text-ink-soft"
                onClick={() => {
                  cancel.reset();
                  setCancelling(false);
                }}
              >
                Volver
              </button>
              <button
                className="rounded-full bg-red-700 px-3 py-1.5 text-sm text-white"
                onClick={() => {
                  const input = document.getElementById(`cancel-reason-${deal.id}`) as HTMLInputElement;
                  cancel.mutate(
                    { id: deal.id, cancelReason: input.value || "Sin motivo" },
                    { onSuccess: () => setCancelling(false) },
                  );
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
