import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ContactInput,
  type NewClientInput,
  archiveContact,
  createClient,
  deleteClientPermanently,
  fetchContact,
  fetchContacts,
  fetchDeleteImpact,
  updateContact,
} from "../../api/contacts";

export const CONTACTS_PAGE_SIZE = 50;

export function useContactsList(params: {
  q?: string;
  includeArchived?: boolean;
  limit: number;
  offset: number;
}) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => fetchContacts(params),
    // Sin esto la tabla parpadea en blanco en cada cambio de página.
    placeholderData: keepPreviousData,
  });
}

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () => fetchContact(id),
    enabled: !!id,
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactInput> }) =>
      updateContact(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", id] });
    },
  });
}

export function useArchiveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveContact(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", id] });
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewClientInput) => createClient(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useDeleteImpact(id: string | null) {
  return useQuery({
    queryKey: ["contact-delete-impact", id],
    queryFn: () => fetchDeleteImpact(id!),
    enabled: !!id,
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClientPermanently(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
