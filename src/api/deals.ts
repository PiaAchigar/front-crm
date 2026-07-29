import { apiFetch } from "./client";

export type Stage =
  | "lead"
  | "contactado"
  | "presupuestado"
  | "senia_pagada"
  | "confirmado"
  | "completado";

export type Deal = {
  id: string;
  contactId: string | null;
  contactName: string | null;
  title: string | null;
  serviceName: string | null;
  servicePrice: string | null;
  seniaAmount: string | null;
  stage: Stage;
  assignedAgentId: string | null;
  cancelled: boolean | null;
  cancelReason: string | null;
};

export type Agent = { id: string; fullName: string | null; email: string | null };

export function fetchDeals(): Promise<Deal[]> {
  return apiFetch("/api/crm/deals");
}

export function fetchAgents(): Promise<Agent[]> {
  return apiFetch("/api/crm/deals/agents");
}

export function createDeal(data: { contactId: string; title: string }): Promise<Deal> {
  return apiFetch("/api/crm/deals", { method: "POST", body: JSON.stringify(data) });
}

export function updateDealStage(id: string, stage: Stage): Promise<Deal> {
  return apiFetch(`/api/crm/deals/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) });
}

export function assignDeal(id: string, assignedAgentId: string | null): Promise<Deal> {
  return apiFetch(`/api/crm/deals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ assignedAgentId }),
  });
}

export function cancelDeal(id: string, cancelReason: string): Promise<Deal> {
  return apiFetch(`/api/crm/deals/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ cancelReason }),
  });
}

export function updateDealTitle(id: string, title: string): Promise<Deal> {
  return apiFetch(`/api/crm/deals/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
}
