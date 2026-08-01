import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deactivateCredential,
  getAICredentials,
  saveAICredential,
  type AICredentialCreate,
} from "../../api/ai-config";

const QUERY_KEY = ["ai-credentials"];

export function useAICredentialsList() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: getAICredentials });
}

export function useSaveAICredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credential: AICredentialCreate) => saveAICredential(credential),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeactivateAICredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
