/**
 * Pestaña "Materiales" del proyecto (decisión Álvaro, 7 nov 2026):
 * la oficina elige los materiales y herrajes; el taller solo los consulta.
 */
export const MATERIALS_EDIT_ROLES = ["super_admin", "admin", "comercial", "disenador"] as const;
export const MATERIALS_VIEW_ROLES = [...MATERIALS_EDIT_ROLES, "jefe_taller", "operario"] as const;

export const canEditMaterials = (role?: string | null) =>
  !!role && (MATERIALS_EDIT_ROLES as readonly string[]).includes(role);

export const canViewMaterials = (role?: string | null) =>
  !!role && (MATERIALS_VIEW_ROLES as readonly string[]).includes(role);

export const WOOD_TYPE_LABELS: Record<string, string> = {
  rh: "RH (resistente a la humedad)",
  estandar: "Estándar",
};

export const COUNTERTOP_TYPE_LABELS: Record<string, string> = {
  granito: "Granito",
  cuarzo: "Cuarzo",
  sinterizado: "Sinterizado",
};

export const HARDWARE_CATEGORY_LABELS: Record<string, string> = {
  cocinas: "Cocinas",
  closets: "Closets",
  puertas: "Puertas",
};
