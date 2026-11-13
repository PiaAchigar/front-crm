import type { Agent } from "../api/deals";

/** Texto de un agente en los dropdowns: el nombre corto que arma la API. */
export function etiquetaAgente(a: Pick<Agent, "fullName" | "email"> & { nombreCorto?: string }) {
  return a.nombreCorto || a.fullName || a.email || "Sin nombre";
}
