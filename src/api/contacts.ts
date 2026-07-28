import { apiFetch } from "./client";

export type Contact = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  createdAt: string;
};

export type ContactInput = {
  name: string;
  email?: string;
  phone?: string;
  status?: "prospect" | "customer" | "inactive";
  notes?: string;
};

export function fetchContacts(params: { status?: string; q?: string }): Promise<Contact[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  return apiFetch(`/api/crm/contacts?${qs.toString()}`);
}

export function createContact(data: ContactInput): Promise<Contact> {
  return apiFetch("/api/crm/contacts", { method: "POST", body: JSON.stringify(data) });
}

export function updateContact(id: string, data: Partial<ContactInput>): Promise<Contact> {
  return apiFetch(`/api/crm/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
