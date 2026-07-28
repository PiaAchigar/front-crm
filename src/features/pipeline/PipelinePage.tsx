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
  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[220px] flex-1 flex-col gap-2 rounded-lg p-2 ${
        isOver ? "bg-surface-high" : "bg-surface-container"
      }`}
    >
      <h3 className="px-1 text-sm font-semibold text-ink-soft">{label}</h3>
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

  const visibleDeals = deals.filter((d) => !d.cancelled);

  function handleDragEnd(event: DragEndEvent) {
    const dealId = event.active.id as string;
    const newStage = event.over?.id as Stage | undefined;
    if (!newStage) return;
    const deal = visibleDeals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;
    updateStage.mutate({ id: dealId, stage: newStage });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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
              deals={visibleDeals.filter((d) => d.stage === key)}
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
