import type { ChannelType } from "../../api/channels";

export type ChannelField = { key: string; label: string; type: "text" | "number" };

/** Metadata de display + campos editables por canal (todos NO-secretos). */
export const CHANNEL_META: Record<
  ChannelType,
  { label: string; icon: string; fields: ChannelField[] }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: "🟢",
    fields: [
      { key: "phoneNumber", label: "Número (visible)", type: "text" },
      { key: "phoneNumberId", label: "Phone number ID (Meta)", type: "text" },
    ],
  },
  instagram: {
    label: "Instagram",
    icon: "📸",
    fields: [
      { key: "accountId", label: "Business account ID", type: "text" },
      { key: "handle", label: "@usuario", type: "text" },
    ],
  },
  facebook: {
    label: "Facebook",
    icon: "👍",
    fields: [
      { key: "pageId", label: "Page ID", type: "text" },
      { key: "pageName", label: "Nombre de página", type: "text" },
    ],
  },
  email: {
    label: "Email",
    icon: "✉️",
    fields: [
      { key: "fromAddress", label: "Remitente (from)", type: "text" },
      { key: "smtpHost", label: "SMTP host", type: "text" },
      { key: "smtpPort", label: "SMTP puerto", type: "number" },
    ],
  },
};

export const CHANNEL_ORDER: ChannelType[] = ["whatsapp", "instagram", "facebook", "email"];
