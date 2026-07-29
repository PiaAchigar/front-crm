import { useState } from "react";
import type { Channel } from "../../api/channels";
import { can } from "../../lib/permissions";
import { useCrmSession } from "../../lib/session";
import { CHANNEL_ORDER } from "./channels.config";
import { ChannelCard } from "./ChannelCard";
import { ChannelFormModal } from "./ChannelFormModal";
import { useChannelsList } from "./useChannels";

export function ChannelsPage() {
  const { role } = useCrmSession();
  const canEdit = can(role, "crm", "manage");
  const { data: channels = [], isLoading, isError } = useChannelsList();
  const [editing, setEditing] = useState<Channel | null>(null);

  if (isLoading) {
    return <p className="text-sm text-ink-soft">Cargando canales…</p>;
  }
  if (isError) {
    return (
      <p className="text-sm text-red-600">
        No pudimos cargar los canales. Reintentá en unos segundos.
      </p>
    );
  }

  const byType = new Map(channels.map((c) => [c.channelType, c]));
  const ordered = CHANNEL_ORDER.map((ct) => byType.get(ct)).filter(
    (c): c is Channel => Boolean(c),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Canales</h1>
        <p className="text-sm text-ink-soft">
          Configuración de WhatsApp, Instagram, Facebook y email. El envío real se habilita en
          una fase posterior.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ordered.map((ch) => (
          <ChannelCard
            key={ch.channelType}
            channel={ch}
            canEdit={canEdit}
            onEdit={() => setEditing(ch)}
          />
        ))}
      </div>
      {editing && <ChannelFormModal channel={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
