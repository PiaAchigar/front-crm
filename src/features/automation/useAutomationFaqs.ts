// src/features/automation/useAutomationFaqs.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AutomationFaqInput,
  createAutomationFaq,
  deleteAutomationFaq,
  fetchAutomationFaqs,
  updateAutomationFaq,
} from "../../api/automationFaqs";

export function useAutomationFaqs() {
  return useQuery({ queryKey: ["automation-faqs"], queryFn: fetchAutomationFaqs });
}

export function useCreateAutomationFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AutomationFaqInput) => createAutomationFaq(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-faqs"] }),
  });
}

export function useUpdateAutomationFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AutomationFaqInput }) =>
      updateAutomationFaq(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-faqs"] }),
  });
}

export function useDeleteAutomationFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAutomationFaq(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-faqs"] }),
  });
}
