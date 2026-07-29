import { useState } from "react";
import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { Agent, Deal, Stage } from "../../api/deals";
import { useAgentsList, useCreateDeal, useDealsList, useUpdateDealStage } from "./usePipeline";
import { DealCard } from "./DealCard";
import { DealFormModal } from "./DealFormModal";

const STAGES: { key: Stage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "contactado", label: "Contactado" },
  { key: "presupuestado", label: "Presupuestado" },
  { key: "senia_pagada", label: "Seña pagada" },
  { key: "confirmado", label: "Confirmado" },
  { key: "completado", label: "Completado" },
];

/** Suma los montos (servicePrice) de los deals ACTIVOS — los cancelados no
 *  cuentan como valor de pipeline aunque estén visibles. */
function sumPrices(deals: Deal[]): number {
  return deals
    .filter((d) => !d.cancelled)
    .reduce((acc, d) => acc + Number(d.servicePrice ?? 0), 0);
}

function Column({
  stage,
  label,
  deals,
  agents,
}: {
  stage: Stage;
  label: string;
  deals: Deal[];
  agents: Agent[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = sumPrices(deals);
  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[220px] flex-1 flex-col gap-2 rounded-lg p-2 ${
        isOver ? "bg-surface-high" : "bg-surface-container"
      }`}
    >
      <div className="px-1">
        <h3 className="text-sm font-semibold text-ink-soft">{label}</h3>
        <p className="text-xs text-ink-soft">
          {deals.length} · ${total.toLocaleString("es-AR")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} agents={agents} />
        ))}
      </div>
    </div>
  );
}

export function PipelinePage() {
  const { data: deals = [] } = useDealsList();
  const { data: agents = [] } = useAgentsList();
  const updateStage = useUpdateDealStage();
  const createDeal = useCreateDeal();
  const [creating, setCreating] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");
  const [q, setQ] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const filtered = deals
    .filter((d) => (showCancelled ? true : !d.cancelled))
    .filter((d) =>
      agentFilter === ""
        ? true
        : agentFilter === "unassigned"
          ? !d.assignedAgentId
          : d.assignedAgentId === agentFilter,
    )
    .filter((d) =>
      q.trim() === ""
        ? true
        : (d.contactName ?? "").toLowerCase().includes(q.trim().toLowerCase()),
    );

  function handleDragEnd(event: DragEndEvent) {
    const dealId = event.active.id as string;
    const newStage = event.over?.id as Stage | undefined;
    if (!newStage) return;
    const deal = filtered.find((d) => d.id === dealId);
    if (!deal || deal.cancelled || deal.stage === newStage) return;
    updateStage.mutate({ id: dealId, stage: newStage });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded border border-surface-highest bg-surface-low px-3 py-1.5 text-sm"
            placeholder="Buscar por contacto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded border border-surface-highest bg-surface-low px-3 py-1.5 text-sm"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="">Todos los agentes</option>
            <option value="unassigned">Sin asignar</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName ?? a.email}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            Mostrar cancelados
          </label>
        </div>
        <button
          className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
          onClick={() => {
            createDeal.reset();
            setCreating(true);
          }}
        >
          + Nuevo deal
        </button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(({ key, label }) => (
            <Column
              key={key}
              stage={key}
              label={label}
              deals={filtered.filter((d) => d.stage === key)}
              agents={agents}
            />
          ))}
        </div>
      </DndContext>

      {creating && (
        <DealFormModal
          saving={createDeal.isPending}
          error={createDeal.error ? createDeal.error.message : null}
          onClose={() => setCreating(false)}
          onSave={(data) => createDeal.mutate(data, { onSuccess: () => setCreating(false) })}
        />
      )}
    </div>
  );
}
