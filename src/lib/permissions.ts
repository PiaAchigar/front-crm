/** Espejo de api-sistema-central/src/lib/permissions.ts (sección usada por el CRM).
 *  FUENTE: reglas_negocio.md §1.7. Mantener sincronizado. */

export type Role = "admin" | "manager" | "operator" | "sales" | "accountant";
export type Capability = "view" | "edit" | "manage";
export type Section = "crm";

const PERMISSIONS: Record<Section, Record<Capability, Role[]>> = {
  crm: {
    view: ["admin", "manager", "operator", "sales"],
    edit: ["admin", "manager", "operator", "sales"],
    manage: ["admin"],
  },
};

export function can(
  role: Role | null | undefined,
  section: Section,
  cap: Capability,
): boolean {
  if (!role) return false;
  return PERMISSIONS[section][cap].includes(role as Role);
}
