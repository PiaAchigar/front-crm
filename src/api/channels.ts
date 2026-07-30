import { apiFetch } from "./client";

export type ChannelType = "whatsapp" | "instagram" | "facebook" | "email";
export type ChannelStatus = "sin_configurar" | "inactivo" | "activo";

export type Channel = {
  channelType: ChannelType;
  isActive: boolean;
  config: Record<string, unknown>;
  status: ChannelStatus;
  updatedAt: string | null;
};

export function fetchChannels(): Promise<Channel[]> {
  return apiFetch("/api/crm/channels");
}

export function upsertChannel(
  channelType: ChannelType,
  data: {
    config: Record<string, unknown>;
    isActive: boolean;
    credentials?: Record<string, unknown>;
  },
): Promise<Channel> {
  return apiFetch(`/api/crm/channels/${channelType}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
