import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type RuleInput,
  createRule,
  deleteRule,
  fetchRules,
  fetchRuns,
  simulateInbound,
  updateRule,
} from "../../api/automations";

export function useRules() {
  return useQuery({ queryKey: ["automations"], queryFn: fetchRules });
}

export function useRuns() {
  return useQuery({ queryKey: ["automation-runs"], queryFn: fetchRuns });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RuleInput) => createRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RuleInput }) => updateRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useSimulateInbound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      simulateInbound(conversationId, content),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
