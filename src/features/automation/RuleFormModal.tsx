import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgents } from "../../api/deals";
import type { Condition, Rule, RuleInput } from "../../api/automations";
import {
  ACTION_LABELS,
  CHANNELS,
  CONDITION_LABELS,
  STAGES,
  TRIGGERS,
  TRIGGER_ACTIONS,
  TRIGGER_CONDITIONS,
  type ActionType,
  type ConditionType,
  type TriggerType,
} from "./automation.config";
import { useCreateRule, useUpdateRule } from "./useAutomations";

export function RuleFormModal({ rule, onClose }: { rule: Rule | null; onClose: () => void }) {
  const create = useCreateRule();
  const update = useUpdateRule();
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });

  const [name, setName] = useState(rule?.name ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(rule?.triggerType ?? "incoming_message");
  const [actionType, setActionType] = useState<ActionType>(rule?.actionType ?? "reply_text");
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>(rule?.actionConfig ?? {});
  const [conditions, setConditions] = useState<Condition[]>(rule?.conditions ?? []);

  const validActions = TRIGGER_ACTIONS[triggerType];
  const validConditions = TRIGGER_CONDITIONS[triggerType];
  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // Si el disparador cambia, resetear acción/condiciones a algo válido.
  function changeTrigger(t: TriggerType) {
    setTriggerType(t);
    setActionType(TRIGGER_ACTIONS[t][0]);
    setActionConfig({});
    setConditions([]);
  }

  const agentOptions = useMemo(
    () => agents.map((a) => ({ id: a.id, label: a.fullName ?? a.email ?? a.id })),
    [agents],
  );

  function save() {
    const input: RuleInput = {
      name: name.trim(),
      isActive: rule?.isActive ?? true,
      triggerType,
      conditions,
      actionType,
      actionConfig,
    };
    if (!input.name) return;
    const opts = { onSuccess: onClose };
    if (rule) update.mutate({ id: rule.id, data: input }, opts);
    else create.mutate(input, opts);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">{rule ? "Editar regla" : "Nueva regla"}</h2>

        <label className="mb-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">Nombre</span>
          <input
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="mb-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">Cuando…</span>
          <select
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={triggerType}
            onChange={(e) => changeTrigger(e.target.value as TriggerType)}
          >
            {TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <div className="mb-3 rounded-lg border border-surface-highest p-3">
          <p className="mb-2 text-sm text-ink-soft">Si… (condiciones, opcionales)</p>
          {conditions.length > 1 && (
            <p className="mb-2 text-xs text-ink-soft">
              Deben cumplirse <strong>todas</strong> las condiciones a la vez (Y). Si querés que
              alcance con una sola palabra entre varias, creá una regla separada por cada palabra.
            </p>
          )}
          {conditions.map((cond, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <select
                className="rounded border border-surface-highest bg-surface px-2 py-1 text-xs"
                value={cond.type}
                onChange={(e) => {
                  const type = e.target.value as ConditionType;
                  setConditions((cs) => cs.map((c, j) => (j === i ? { type, value: "" } : c)));
                }}
              >
                {validConditions.map((ct) => (
                  <option key={ct} value={ct}>{CONDITION_LABELS[ct]}</option>
                ))}
              </select>
              <ConditionValue
                cond={cond}
                onChange={(value) =>
                  setConditions((cs) => cs.map((c, j) => (j === i ? { ...c, value } : c)))
                }
              />
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={() => setConditions((cs) => cs.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            className="text-xs text-primary hover:underline"
            onClick={() =>
              setConditions((cs) => [...cs, { type: validConditions[0], value: "" }])
            }
          >
            + Agregar condición
          </button>
        </div>

        <label className="mb-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">Entonces…</span>
          <select
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value as ActionType);
              setActionConfig({});
            }}
          >
            {validActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
        </label>

        <div className="mb-4">
          {actionType === "reply_text" && (
            <textarea
              className="w-full rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              placeholder="Texto de la respuesta"
              value={String(actionConfig.text ?? "")}
              onChange={(e) => setActionConfig({ text: e.target.value })}
            />
          )}
          {actionType === "reply_faq" && (
            <p className="rounded-lg bg-surface-high p-3 text-xs text-ink-soft">
              Esta acción no necesita configuración: al ejecutarse, revisa todas tus FAQs activas
              (sección "FAQs" de Automatización) y responde con la que coincida por palabra clave.
            </p>
          )}
          {actionType === "change_deal_stage" && (
            <select
              className="w-full rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              value={String(actionConfig.stage ?? "")}
              onChange={(e) => setActionConfig({ stage: e.target.value })}
            >
              <option value="">Elegí una etapa</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {actionType === "assign_agent" && (
            <select
              className="w-full rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              value={String(actionConfig.agentId ?? "")}
              onChange={(e) => setActionConfig({ agentId: e.target.value })}
            >
              <option value="">Elegí una agente</option>
              {agentOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="mb-2 text-sm text-red-600">{(error as Error).message}</p>}

        <div className="flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            disabled={saving || !name.trim()}
            onClick={save}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConditionValue({ cond, onChange }: { cond: Condition; onChange: (v: string) => void }) {
  if (cond.type === "channel_is") {
    return (
      <select
        className="rounded border border-surface-highest bg-surface px-2 py-1 text-xs"
        value={cond.value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {CHANNELS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    );
  }
  if (cond.type === "deal_to_stage") {
    return (
      <select
        className="rounded border border-surface-highest bg-surface px-2 py-1 text-xs"
        value={cond.value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      className="flex-1 rounded border border-surface-highest bg-surface px-2 py-1 text-xs"
      placeholder="texto"
      value={cond.value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
