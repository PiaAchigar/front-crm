import type { Parentesco } from "../../api/contacts";

export const ETIQUETA_PARENTESCO: Record<Parentesco, string> = {
  pareja: "Pareja",
  hijo: "Hijo",
  hija: "Hija",
  nieto: "Nieto",
  nieta: "Nieta",
  otro: "Otro",
};

/** "Hija", o el texto libre si es "otro" (con su aclaración). */
export function etiquetaDeParentesco(
  relationship: string | null,
  relationshipOther: string | null,
): string {
  if (!relationship) return "";
  if (relationship === "otro") return relationshipOther?.trim() || "Otro";
  return ETIQUETA_PARENTESCO[relationship as Parentesco] ?? relationship;
}
