import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ContactInput, createContact, fetchContacts, updateContact } from "../../api/contacts";

export function useContactsList(params: { status?: string; q?: string }) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => fetchContacts(params),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
