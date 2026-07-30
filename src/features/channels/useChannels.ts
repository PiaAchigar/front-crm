import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChannelType, fetchChannels, upsertChannel } from "../../api/channels";

export function useChannelsList() {
  return useQuery({ queryKey: ["channels"], queryFn: fetchChannels });
}

export function useUpsertChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelType,
      config,
      isActive,
      credentials,
    }: {
      channelType: ChannelType;
      config: Record<string, unknown>;
      isActive: boolean;
      credentials?: Record<string, unknown>;
    }) => upsertChannel(channelType, { config, isActive, credentials }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}
