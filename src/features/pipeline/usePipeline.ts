import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignDeal,
  cancelDeal,
  createDeal,
  fetchAgents,
  fetchDeals,
  updateDealStage,
  updateDealTitle,
  type Stage,
} from "../../api/deals";

export function useDealsList() {
  return useQuery({ queryKey: ["deals"], queryFn: fetchDeals });
}

export function useAgentsList() {
  return useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
}

function useDealsInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["deals"] });
}

export function useUpdateDealStage() {
  const invalidate = useDealsInvalidate();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) => updateDealStage(id, stage),
    onSuccess: invalidate,
  });
}

export function useAssignDeal() {
  const invalidate = useDealsInvalidate();
  return useMutation({
    mutationFn: ({ id, assignedAgentId }: { id: string; assignedAgentId: string | null }) =>
      assignDeal(id, assignedAgentId),
    onSuccess: invalidate,
  });
}

export function useCancelDeal() {
  const invalidate = useDealsInvalidate();
  return useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason: string }) =>
      cancelDeal(id, cancelReason),
    onSuccess: invalidate,
  });
}

export function useCreateDeal() {
  const invalidate = useDealsInvalidate();
  return useMutation({
    mutationFn: (data: { contactId: string; title: string }) => createDeal(data),
    onSuccess: invalidate,
  });
}

export function useUpdateDealTitle() {
  const invalidate = useDealsInvalidate();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateDealTitle(id, title),
    onSuccess: invalidate,
  });
}
