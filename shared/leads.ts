/**
 * Interesados (leads): textos y opciones compartidos entre el CRM, la página
 * pública "Pide tu visita" y el servidor.
 */
export const LEAD_WORK_TYPES = [
  { value: "cocina", label: "Cocina integral" },
  { value: "closet", label: "Closet" },
  { value: "mueble_bano", label: "Mueble de baño" },
  { value: "centro_tv", label: "Centro de TV" },
  { value: "puertas", label: "Puertas" },
  { value: "otro", label: "Otro" },
] as const;
export type LeadWorkType = (typeof LEAD_WORK_TYPES)[number]["value"];
export const LEAD_WORK_TYPE_VALUES = LEAD_WORK_TYPES.map(w => w.value) as [LeadWorkType, ...LeadWorkType[]];

export const LEAD_SOURCES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "web", label: "Página web" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "referido", label: "Referido" },
  { value: "otro", label: "Otro" },
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number]["value"];
export const LEAD_SOURCE_VALUES = LEAD_SOURCES.map(s => s.value) as [LeadSource, ...LeadSource[]];

export const LEAD_STATUSES = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "cita_agendada", label: "Cita agendada" },
  { value: "descartado", label: "No le interesó" },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];
export const LEAD_STATUS_VALUES = LEAD_STATUSES.map(s => s.value) as [LeadStatus, ...LeadStatus[]];

/** Estados en los que todavía hay que hacer algo. */
export const LEAD_OPEN_STATUSES: LeadStatus[] = ["nuevo", "contactado"];

const label = (list: readonly { value: string; label: string }[], v: string | null | undefined) =>
  list.find(x => x.value === v)?.label || v || "";

export const leadWorkTypeLabel = (v: string) => label(LEAD_WORK_TYPES, v);
export const leadSourceLabel = (v: string) => label(LEAD_SOURCES, v);
export const leadStatusLabel = (v: string) => label(LEAD_STATUSES, v);

/** "cocina,closet" → "Cocina integral, Closet" */
export function leadWorkTypesText(csv: string | null | undefined): string {
  return (csv || "").split(",").map(s => s.trim()).filter(Boolean).map(leadWorkTypeLabel).join(", ");
}

/** Solo dígitos; si son 10 dígitos (celular colombiano) se antepone 57. */
export function normalizeLeadPhone(raw: string, countryCode = "57"): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `${countryCode}${digits}`;
  return digits;
}

/** Número de WhatsApp de Innovar (único número de contacto con clientes). */
export const INNOVAR_WHATSAPP = "573136802025";
