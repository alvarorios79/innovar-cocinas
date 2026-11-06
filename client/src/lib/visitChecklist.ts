/**
 * Etiquetas y utilidades del checklist del levantamiento (lo que marca el medidor).
 * El checklist se guarda como JSON plano en technicalVisits.checklist:
 *  - claves booleanas históricas (puntoGas, puntoHidraulico, ...)
 *  - electrodomésticos de cocina: elec_<nombre> (booleano) + elec_otroDescripcion (texto)
 *  - accesorios de closet: closet_<nombre> (booleano) + closet_otroDescripcion (texto)
 *  - notaEspecial (texto libre para dejar registro de algo especial)
 */

export const COCINA_ELECTRO: Array<{ key: string; label: string }> = [
  { key: "elec_estufa", label: "Estufa" },
  { key: "elec_horno", label: "Horno" },
  { key: "elec_extractor", label: "Extractor" },
  { key: "elec_lavavajillas", label: "Lavavajillas" },
  { key: "elec_lavaplatos", label: "Lavaplatos" },
  { key: "elec_platero", label: "Platero" },
  { key: "elec_microondas", label: "Horno microondas" },
  { key: "elec_nevera", label: "Nevera" },
  { key: "elec_nevecon", label: "Nevecón" },
  { key: "elec_airFryer", label: "Air fryer" },
  { key: "elec_filtroAgua", label: "Filtro de agua" },
  { key: "elec_otro", label: "Otro" },
];

export const CLOSET_ACCESORIOS: Array<{ key: string; label: string }> = [
  { key: "closet_elevador", label: "Elevador" },
  { key: "closet_luzLed", label: "Luz LED" },
  { key: "closet_joyero", label: "Joyero" },
  { key: "closet_otro", label: "Otro" },
];

const BASE_LABELS: Record<string, string> = {
  puntoGas: "Punto de gas", puntoHidraulico: "Punto hidráulico", desague: "Desagüe",
  tomasElectricas: "Tomas eléctricas", ventanas: "Ventanas", columnas: "Columnas",
  pisoNivelado: "Piso nivelado", techoNivelado: "Techo nivelado",
  murosTerminados: "Muros terminados", pisoTerminado: "Piso terminado",
  escuadraValidada: "Escuadra validada", grosorMuroValidado: "Grosor de muro validado",
  aperturaValidada: "Apertura validada", puntoTV: "Punto TV", internet: "Internet",
  canalizaciones: "Canalizaciones", otro: "Otro",
};

export type ChecklistView = {
  general: Array<{ key: string; label: string; done: boolean }>;
  electro: string[];
  closet: string[];
  nota: string;
};

/** Separa el checklist en: items generales, electrodomésticos marcados, accesorios de closet y nota especial. */
export function getChecklistView(
  checklist: Record<string, unknown> | null | undefined,
  extraLabels: Record<string, string> = {},
): ChecklistView {
  const cl = (checklist ?? {}) as Record<string, unknown>;
  const labels = { ...BASE_LABELS, ...extraLabels };
  const general: ChecklistView["general"] = [];
  for (const [key, val] of Object.entries(cl)) {
    if (key.startsWith("elec_") || key.startsWith("closet_") || key === "notaEspecial") continue;
    if (typeof val === "string") continue; // descripciones (otroDescripcion) se muestran junto a "Otro"
    const base = labels[key] ?? key;
    const desc = key === "otro" && typeof cl.otroDescripcion === "string" && cl.otroDescripcion.trim()
      ? `: ${cl.otroDescripcion.trim()}` : "";
    general.push({ key, label: base + desc, done: val === true });
  }
  const pick = (list: Array<{ key: string; label: string }>, prefix: string) =>
    list.filter((i) => cl[i.key] === true).map((i) => {
      const d = i.key === `${prefix}_otro` ? (cl[`${prefix}_otroDescripcion`] as string | undefined) : undefined;
      return d && d.trim() ? `${i.label}: ${d.trim()}` : i.label;
    });
  return {
    general,
    electro: pick(COCINA_ELECTRO, "elec"),
    closet: pick(CLOSET_ACCESORIOS, "closet"),
    nota: typeof cl.notaEspecial === "string" ? cl.notaEspecial.trim() : "",
  };
}
