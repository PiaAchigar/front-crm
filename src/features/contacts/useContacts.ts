import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ContactInput,
  archiveContact,
  createContact,
  fetchContact,
  fetchContacts,
  updateContact,
} from "../../api/contacts";

export function useContactsList(params: { status?: string; q?: string; includeArchived?: boolean }) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => fetchContacts(params),
  });
}

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () => fetchContact(id),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactInput) => createContact(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
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
