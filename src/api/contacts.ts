import { apiFetch } from "./client";

export type Contact = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  whatsappId: string | null;
  instagramId: string | null;
  facebookId: string | null;
  birthdate: string | null;
  tags: string[] | null;
  preferredService: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  isArchived: boolean | null;
  createdAt: string;
};

export type ContactInput = {
  name: string;
  email?: string;
  phone?: string;
  status?: "prospect" | "customer" | "inactive";
  notes?: string;
  whatsappId?: string;
  instagramId?: string;
  facebookId?: string;
  birthdate?: string;
  tags?: string[];
  preferredService?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  isArchived?: boolean;
};

export type CustomerAccount = {
  id: string;
  dni: string | null;
  cuit: string | null;
  creditBalance: string;
};

export type ContactDeal = {
  id: string;
  title: string | null;
  serviceName: string | null;
  servicePrice: string | null;
  seniaAmount: string | null;
  seniaPaid: boolean | null;
  stage: string;
  cancelled: boolean | null;
  totalAmount: string | null;
  amountPaid: string | null;
  amountPending: string | null;
  createdAt: string;
};

export type ContactAppointment = {
  id: string;
  serviceName: string | null;
  appointmentStart: string | null;
  appointmentEnd: string | null;
  servicePrice: string | null;
  status: string | null;
};

// `listByCustomerId` hace un `select()` sin proyección: devuelve la fila entera
// de training_subscriptions.
export type ContactSubscription = {
  id: string;
  activityId: string | null;
  status: string | null;
  monthlyAmount: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
};

// Campos tomados de `invoiceSummary` en invoices.repo.ts. OJO: son
// `totalAmount` e `invoiceDate` — NO `total` ni `createdAt`, que no existen.
export type ContactInvoice = {
  id: string;
  invoiceNumber: number | null;
  invoiceType: string | null;
  status: string | null;
  totalAmount: string | null;
  invoiceDate: string | null;
};

export type ContactDetail = {
  contact: Contact;
  customer: CustomerAccount | null;
  deals: ContactDeal[];
  appointments: ContactAppointment[];
  subscriptions: ContactSubscription[];
  invoices: ContactInvoice[];
};

// NO llamarlo `ContactsPage`: así se llama el componente de la pantalla, y los
// dos se importan en el mismo archivo.
export type ContactListPage = { items: Contact[]; total: number };

/** "recent" = alta más nueva primero, el orden histórico de la pantalla. */
export type ContactSort = "recent" | "nameAsc" | "nameDesc";

export function fetchContacts(params: {
  q?: string;
  includeArchived?: boolean;
  sort?: ContactSort;
  limit: number;
  offset: number;
}): Promise<ContactListPage> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.includeArchived) qs.set("includeArchived", "true");
  if (params.sort) qs.set("sort", params.sort);
  qs.set("limit", String(params.limit));
  qs.set("offset", String(params.offset));
  return apiFetch(`/api/crm/contacts?${qs.toString()}`);
}

export function fetchContact(id: string): Promise<ContactDetail> {
  return apiFetch(`/api/crm/contacts/${id}`);
}

export function updateContact(id: string, data: Partial<ContactInput>): Promise<Contact> {
  return apiFetch(`/api/crm/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function archiveContact(id: string): Promise<Contact> {
  return apiFetch(`/api/crm/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isArchived: true }),
  });
}

/** Devuelve un cliente archivado a la operación. Archivar lo saca de TODOS los
 *  selectores del sistema (agenda, facturación, suscripciones), así que sin esto
 *  un archivado por error sería irreversible desde la interfaz. */
export function unarchiveContact(id: string): Promise<Contact> {
  return apiFetch(`/api/crm/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isArchived: false }),
  });
}

export type NewClientInput = {
  name: string;
  dni: string;
  phone?: string;
  email?: string;
};

export type CustomerSummary = {
  id: string;
  contactId: string;
  dni: string | null;
  cuit: string | null;
  creditBalance: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

/** Alta de CLIENTE: crea contacto + customer en una transacción del backend.
 *  Es el mismo endpoint que usa el alta rápida de la Agenda, a propósito —
 *  quien se cargue acá tiene que poder recibir turnos y facturas, y para eso
 *  necesita fila en `customers`. `POST /api/crm/contacts` NO sirve: crea solo
 *  el contacto. */
export function createClient(data: NewClientInput): Promise<CustomerSummary> {
  return apiFetch("/api/billing/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type ClientDeleteImpact = {
  blocked: boolean;
  blockReason?: string;
  history: {
    invoices: number;
    payments: number;
    appointments: number;
    subscriptions: number;
    enrollments: number;
  };
  cascade: {
    conversations: number;
    messages: number;
    deals: number;
    callLogs: number;
    analyticsEvents: number;
  };
};

export function fetchDeleteImpact(id: string): Promise<ClientDeleteImpact> {
  return apiFetch(`/api/crm/contacts/${id}/delete-impact`);
}

export function deleteClientPermanently(id: string): Promise<{ deleted: boolean }> {
  return apiFetch(`/api/crm/contacts/${id}/permanent`, { method: "DELETE" });
}
