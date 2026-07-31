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

export function useConversationsList(filters: ConversationFilters) {
  return useQuery({
    queryKey: ["conversations", filters],
    queryFn: () => fetchConversations(filters),
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
