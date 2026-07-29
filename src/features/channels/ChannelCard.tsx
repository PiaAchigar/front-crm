import type { Channel } from "../../api/channels";
import { CHANNEL_META } from "./channels.config";
import { useUpsertChannel } from "./useChannels";

const STATUS_LABEL: Record<Channel["status"], { text: string; cls: string }> = {
  sin_configurar: { text: "Sin configurar", cls: "bg-surface-high text-ink-soft" },
  inactivo: { text: "Configurado · inactivo", cls: "bg-amber-100 text-amber-800" },
  activo: { text: "Activo", cls: "bg-green-100 text-green-800" },
};

export function ChannelCard({
  channel,
  canEdit,
  onEdit,
}: {
  channel: Channel;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const meta = CHANNEL_META[channel.channelType];
  const status = STATUS_LABEL[channel.status];
  const upsert = useUpsertChannel();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-surface-highest bg-surface-low p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <h3 className="text-lg font-semibold">{meta.label}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${status.cls}`}>{status.text}</span>
      </div>

      <dl className="flex flex-col gap-1 text-sm text-ink-soft">
        {meta.fields.map((f) => (
          <div key={f.key} className="flex justify-between gap-2">
            <dt>{f.label}</dt>
            <dd className="truncate text-ink">{String(channel.config[f.key] ?? "—")}</dd>
          </div>
        ))}
      </dl>

      {canEdit && (
        <div className="mt-1 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={channel.isActive}
              disabled={upsert.isPending}
              onChange={(e) =>
                upsert.mutate({
                  channelType: channel.channelType,
                  config: channel.config,
                  isActive: e.target.checked,
                })
              }
            />
            Activo
          </label>
          <button
            className="rounded-full bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark"
            onClick={onEdit}
          >
            Editar
          </button>
        </div>
      )}
    </div>
  );
}
