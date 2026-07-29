import { useState } from "react";
import type { Channel } from "../../api/channels";
import { CHANNEL_META } from "./channels.config";
import { useUpsertChannel } from "./useChannels";

/** Edita la config tipada del canal. Preserva `isActive` (el toggle vive en la
 *  card). Los campos number se mandan como número; el backend valida rangos. */
export function ChannelFormModal({
  channel,
  onClose,
}: {
  channel: Channel;
  onClose: () => void;
}) {
  const meta = CHANNEL_META[channel.channelType];
  const upsert = useUpsertChannel();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(meta.fields.map((f) => [f.key, String(channel.config[f.key] ?? "")])),
  );

  function buildConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const f of meta.fields) {
      const raw = (values[f.key] ?? "").trim();
      if (raw === "") continue;
      config[f.key] = f.type === "number" ? Number(raw) : raw;
    }
    return config;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">
          {meta.icon} {meta.label}
        </h2>
        <div className="flex flex-col gap-3">
          {meta.fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              <span className="text-ink-soft">{f.label}</span>
              <input
                type={f.type === "number" ? "number" : "text"}
                className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </label>
          ))}
          {upsert.isError && (
            <p className="text-sm text-red-600">{(upsert.error as Error).message}</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            disabled={upsert.isPending}
            onClick={() =>
              upsert.mutate(
                {
                  channelType: channel.channelType,
                  config: buildConfig(),
                  isActive: channel.isActive,
                },
                { onSuccess: onClose },
              )
            }
          >
            {upsert.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
