// src/api/automationFaqs.ts
import { apiFetch } from "./client";

export type AutomationFaq = {
  id: string;
  question: string | null;
  answer: string | null;
  keywords: string[] | null;
  isActive: boolean | null;
  createdAt: string;
};

export type AutomationFaqInput = {
  question?: string | null;
  answer: string;
  keywords: string[];
  isActive?: boolean;
};

export function fetchAutomationFaqs(): Promise<AutomationFaq[]> {
  return apiFetch("/api/crm/automation-faqs");
}

export function createAutomationFaq(data: AutomationFaqInput): Promise<AutomationFaq> {
  return apiFetch("/api/crm/automation-faqs", { method: "POST", body: JSON.stringify(data) });
}

export function updateAutomationFaq(id: string, data: AutomationFaqInput): Promise<AutomationFaq> {
  return apiFetch(`/api/crm/automation-faqs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAutomationFaq(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/crm/automation-faqs/${id}`, { method: "DELETE" });
}
