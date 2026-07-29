import { apiFetch } from "./client";
import type {
  ActionType,
  ConditionType,
  TriggerType,
} from "../features/automation/automation.config";

export type Condition = { type: ConditionType; value: string };

export type Rule = {
  id: string;
  name: string | null;
  isActive: boolean | null;
  triggerType: TriggerType | null;
  conditions: Condition[] | null;
  actionType: ActionType | null;
  actionConfig: Record<string, unknown> | null;
  createdAt: string;
};

export type RuleInput = {
  name: string;
  isActive: boolean;
  triggerType: TriggerType;
  conditions: Condition[];
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
};

export type Run = {
  id: string;
  ruleId: string | null;
  ruleName: string | null;
  triggerType: string | null;
  contactId: string | null;
  conversationId: string | null;
  dealId: string | null;
  status: string | null;
  detail: string | null;
  createdAt: string;
};

export function fetchRules(): Promise<Rule[]> {
  return apiFetch("/api/crm/automations");
}

export function createRule(data: RuleInput): Promise<Rule> {
  return apiFetch("/api/crm/automations", { method: "POST", body: JSON.stringify(data) });
}

export function updateRule(id: string, data: RuleInput): Promise<Rule> {
  return apiFetch(`/api/crm/automations/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteRule(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/crm/automations/${id}`, { method: "DELETE" });
}

export function fetchRuns(): Promise<Run[]> {
  return apiFetch("/api/crm/automations/runs");
}

export function simulateInbound(conversationId: string, content: string): Promise<unknown> {
  return apiFetch(`/api/crm/conversations/${conversationId}/simulate-inbound`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
