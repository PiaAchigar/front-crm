import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChannelType } from "../../api/channels";
import {
  type ConversationFilters,
  createConversation,
  fetchConversation,
  fetchConversations,
  sendMessage,
  updateConversation,
} from "../../api/inbox";

/** Cada cuánto se vuelve a pedir la bandeja. Sin esto, una conversación
 *  nueva (de la web o de WhatsApp) no aparecía hasta recargar la página. Con
 *  la pestaña en segundo plano no se pide (default de react-query). */
const BANDEJA_CADA_MS = 10_000;

export function useConversationsList(filters: ConversationFilters) {
  return useQuery({
    queryKey: ["conversations", filters],
    queryFn: () => fetchConversations(filters),
    refetchInterval: BANDEJA_CADA_MS,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ["conversation", id],
    queryFn: () => fetchConversation(id as string),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contactId: string; channel: ChannelType }) => createConversation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => sendMessage(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status?: "open" | "closed"; assignedAgentId?: string | null };
    }) => updateConversation(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ["conversation", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
