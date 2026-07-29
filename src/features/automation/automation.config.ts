export type TriggerType = "incoming_message" | "deal_stage_changed";
export type ActionType = "reply_text" | "change_deal_stage" | "assign_agent";
export type ConditionType = "channel_is" | "message_contains" | "deal_to_stage";

export const TRIGGERS: { value: TriggerType; label: string }[] = [
  { value: "incoming_message", label: "Llega un mensaje de un cliente" },
  { value: "deal_stage_changed", label: "Un deal cambia de etapa" },
];

export const ACTION_LABELS: Record<ActionType, string> = {
  reply_text: "Responder con un texto",
  change_deal_stage: "Cambiar la etapa del deal",
  assign_agent: "Asignar a una agente",
};

export const CONDITION_LABELS: Record<ConditionType, string> = {
  channel_is: "El canal es",
  message_contains: "El mensaje contiene",
  deal_to_stage: "La nueva etapa es",
};

export const TRIGGER_ACTIONS: Record<TriggerType, ActionType[]> = {
  incoming_message: ["reply_text", "assign_agent"],
  deal_stage_changed: ["change_deal_stage", "assign_agent"],
};

export const TRIGGER_CONDITIONS: Record<TriggerType, ConditionType[]> = {
  incoming_message: ["channel_is", "message_contains"],
  deal_stage_changed: ["deal_to_stage"],
};

export const CHANNELS = ["whatsapp", "instagram", "facebook", "email"] as const;
export const STAGES = [
  "lead",
  "contactado",
  "presupuestado",
  "senia_pagada",
  "confirmado",
  "completado",
] as const;
