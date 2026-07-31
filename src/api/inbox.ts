import { apiFetch } from "./client";
import type { ChannelType } from "./channels";

export type Conversation = {
  id: string;
  contactId: string | null;
  contactName: string | null;
  channel: ChannelType | null;
  status: "open" | "closed" | null;
  assignedAgentId: string | null;
  messageCount: number | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
};

export type Message = {
  id: string;
  senderType: "agent" | "contact" | "system" | null;
  content: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

export type ConversationDetail = {
  conversation: Omit<Conversation, "lastMessagePreview">;
  messages: Message[];
  oldestCursor: string | null;
  newestCursor: string | null;
  hasMoreOlder: boolean;
};

export type MessagesPage = {
  messages: Message[];
  oldestCursor: string | null;
  hasMoreOlder: boolean;
};

export type MessagesSince = {
  messages: Message[];
  newestCursor: string | null;
};

export type ConversationFilters = {
  channel?: string;
  status?: string;
  assignedAgentId?: string;
  q?: string;
};

export function fetchConversations(filters: ConversationFilters): Promise<Conversation[]> {
  const qs = new URLSearchParams();
  if (filters.channel) qs.set("channel", filters.channel);
  if (filters.status) qs.set("status", filters.status);
  if (filters.assignedAgentId) qs.set("assignedAgentId", filters.assignedAgentId);
  if (filters.q) qs.set("q", filters.q);
  return apiFetch(`/api/crm/conversations?${qs.toString()}`);
}

export function fetchConversation(id: string): Promise<ConversationDetail> {
  return apiFetch(`/api/crm/conversations/${id}`);
}

export function fetchMessagesBefore(id: string, cursor: string): Promise<MessagesPage> {
  const qs = new URLSearchParams({ before: cursor });
  return apiFetch(`/api/crm/conversations/${id}/messages?${qs.toString()}`);
}

export function fetchMessagesAfter(id: string, cursor: string | null): Promise<MessagesSince> {
  const qs = new URLSearchParams({ after: cursor ?? "" });
  return apiFetch(`/api/crm/conversations/${id}/messages?${qs.toString()}`);
}

export function createConversation(data: {
  contactId: string;
  channel: ChannelType;
}): Promise<Conversation> {
  return apiFetch("/api/crm/conversations", { method: "POST", body: JSON.stringify(data) });
}

export function sendMessage(id: string, content: string): Promise<Message> {
  return apiFetch(`/api/crm/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function updateConversation(
  id: string,
  data: { status?: "open" | "closed"; assignedAgentId?: string | null },
): Promise<Conversation> {
  return apiFetch(`/api/crm/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
