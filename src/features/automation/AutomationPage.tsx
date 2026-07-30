import { useState } from "react";
import type { Rule } from "../../api/automations";
import { ACTION_LABELS, TRIGGERS } from "./automation.config";
import { can } from "../../lib/permissions";
import { useCrmSession } from "../../lib/session";
import { FaqList } from "./FaqList";
import { RuleFormModal } from "./RuleFormModal";
import { RunLog } from "./RunLog";
import { useDeleteRule, useRules, useUpdateRule } from "./useAutomations";

function triggerLabel(v: string | null) {
  return TRIGGERS.find((t) => t.value === v)?.label ?? v ?? "—";
}

export function AutomationPage() {
  const { role } = useCrmSession();
  const canManage = can(role, "crm", "manage");
  const [tab, setTab] = useState<"reglas" | "registro" | "faqs">("reglas");
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: rules = [], isLoading, isError } = useRules();
  const update = useUpdateRule();
  const remove = useDeleteRule();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === "reglas" ? "bg-primary text-white" : "text-ink-soft hover:bg-surface-high"
            }`}
            onClick={() => setTab("reglas")}
          >
            Reglas
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === "faqs" ? "bg-primary text-white" : "text-ink-soft hover:bg-surface-high"
            }`}
            onClick={() => setTab("faqs")}
          >
            FAQs
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === "registro" ? "bg-primary text-white" : "text-ink-soft hover:bg-surface-high"
            }`}
            onClick={() => setTab("registro")}
          >
            Registro
          </button>
        </div>
        {tab === "reglas" && canManage && (
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
            onClick={() => setCreating(true)}
          >
            + Nueva regla
          </button>
        )}
      </div>

      {tab === "registro" ? (
        <RunLog />
      ) : tab === "faqs" ? (
        <FaqList canManage={canManage} />
      ) : isLoading ? (
        <p className="text-sm text-ink-soft">Cargando reglas…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">No pudimos cargar las reglas.</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay reglas. Creá la primera.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-highest bg-surface-low p-3"
            >
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-ink-soft">
                  Cuando: {triggerLabel(r.triggerType)} → {r.actionType ? ACTION_LABELS[r.actionType] : "—"}
                </p>
              </div>
              {canManage && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <input
                      type="checkbox"
                      checked={r.isActive ?? false}
                      onChange={(e) =>
                        update.mutate({
                          id: r.id,
                          data: {
                            name: r.name ?? "",
                            isActive: e.target.checked,
                            triggerType: r.triggerType!,
                            conditions: r.conditions ?? [],
                            actionType: r.actionType!,
                            actionConfig: r.actionConfig ?? {},
                          },
                        })
                      }
                    />
                    Activa
                  </label>
                  <button className="text-xs text-primary hover:underline" onClick={() => setEditing(r)}>
                    Editar
                  </button>
                  <button
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => remove.mutate(r.id)}
                  >
                    Borrar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <RuleFormModal
          rule={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
