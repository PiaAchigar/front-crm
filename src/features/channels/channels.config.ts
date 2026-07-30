import type { ChannelType } from "../../api/channels";

export type ChannelField = { key: string; label: string; type: "text" | "number" };

/** Metadata de display + campos editables por canal (todos NO-secretos), más
 *  `credentialFields` para los canales con integración real (Fase 6: solo
 *  WhatsApp). Los credentialFields se guardan encriptados y nunca vuelven del
 *  backend — los inputs siempre arrancan vacíos. */
export const CHANNEL_META: Record<
  ChannelType,
  { label: string; icon: string; fields: ChannelField[]; credentialFields?: ChannelField[] }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: "🟢",
    fields: [{ key: "phoneNumber", label: "Número (visible)", type: "text" }],
    credentialFields: [
      { key: "accessToken", label: "Access Token", type: "text" },
      { key: "phoneNumberId", label: "Phone Number ID", type: "text" },
      { key: "appSecret", label: "App Secret", type: "text" },
      { key: "verifyToken", label: "Verify Token", type: "text" },
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
