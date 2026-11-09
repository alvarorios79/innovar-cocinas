/**
 * Trabajos reales de un proyecto, leídos de los ítems de su cotización.
 *
 * Problema que evita: el proyecto guarda UN solo tipo (`projects.workType`, que en la BD solo admite
 * cocina | closet | puertas | centro_tv) y cuando la cotización era de tipo "otro" (trabajos mezclados,
 * puertas, baños…) quedaba como "cocina". Ej.: Miriam Zapata tenía 4 proyectos (puertas, puertas,
 * cocina + puertas, isla + baños + closet) y los 4 decían "Cocina integral".
 */

export type WorkKind =
  | "cocina" | "isla" | "muebles_cocina" | "closet" | "mueble_bano" | "puertas"
  | "centro_tv" | "escaleras" | "empresas" | "meson";

/** Grupo para filtrar (la isla y los muebles de cocina cuentan como "Cocina"). */
export type WorkGroup = "cocina" | "closet" | "mueble_bano" | "puertas" | "centro_tv" | "escaleras" | "empresas" | "otro";

export const WORK_KINDS: Record<WorkKind, { label: string; group: WorkGroup; fem: boolean; plural: boolean }> = {
  cocina: { label: "Cocina integral", group: "cocina", fem: true, plural: false },
  isla: { label: "Isla", group: "cocina", fem: true, plural: false },
  muebles_cocina: { label: "Muebles de cocina", group: "cocina", fem: false, plural: true },
  closet: { label: "Closet", group: "closet", fem: false, plural: false },
  mueble_bano: { label: "Mueble de baño", group: "mueble_bano", fem: false, plural: false },
  puertas: { label: "Puertas", group: "puertas", fem: true, plural: true },
  centro_tv: { label: "Centro de TV", group: "centro_tv", fem: false, plural: false },
  escaleras: { label: "Escaleras", group: "escaleras", fem: true, plural: true },
  empresas: { label: "Mobiliario de oficina", group: "empresas", fem: false, plural: false },
  meson: { label: "Mesón", group: "otro", fem: false, plural: false },
};

export const WORK_GROUP_LABELS: Record<WorkGroup, string> = {
  cocina: "Cocinas", closet: "Closets", mueble_bano: "Muebles de baño", puertas: "Puertas",
  centro_tv: "Centros de TV", escaleras: "Escaleras", empresas: "Oficinas", otro: "Otros",
};

/** Orden al mostrar varios trabajos (lo principal primero). */
const ORDER: WorkKind[] = ["cocina", "isla", "muebles_cocina", "closet", "mueble_bano", "centro_tv", "puertas", "escaleras", "empresas", "meson"];

const norm = (s?: string | null) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type QuoteItemLike = { itemType?: string | null; description?: string | null; kitchenConfig?: any };

/** Trabajo(s) de un ítem de cotización. Los herrajes y acabados sueltos no cuentan como trabajo. */
export function worksOfItem(it: QuoteItemLike): WorkKind[] {
  const t = norm(it.itemType);
  const d = norm(it.description);
  switch (t) {
    case "cocina": return ["cocina"];
    case "closet": return ["closet"];
    case "puerta": case "puertas": return ["puertas"];
    case "centro_tv": return ["centro_tv"];
    case "mueble_bano": case "bano": return ["mueble_bano"];
    case "mueble_cocina": {
      const pieza = norm(it.kitchenConfig?.tipoPieza);
      return [pieza === "isla" || pieza === "barra" || /^isla\b/.test(d) ? "isla" : "muebles_cocina"];
    }
    case "mesones": case "meson": return ["meson"];
    case "herrajes": case "acabados_especiales": return [];
  }
  // "otro" o tipos sin reconocer: se lee la descripción
  const out: WorkKind[] = [];
  if (/\bcocina/.test(d)) out.push("cocina");
  else if (/\bisla\b|\bbarra\b/.test(d)) out.push("isla");
  if (/\bban(o|os)\b|lavaman|vanitorio|mueble para bano|mueble de bano/.test(d)) out.push("mueble_bano");
  if (/closet|vestier|armario|ropero/.test(d)) out.push("closet");
  if (/puerta/.test(d)) out.push("puertas");
  if (/centro de entretenimiento|mueble (de |para )?(la )?tv|televis/.test(d)) out.push("centro_tv");
  if (/escalera/.test(d)) out.push("escaleras");
  if (/escritorio|recepcion|oficina/.test(d)) out.push("empresas");
  if (!out.length && /meson/.test(d)) out.push("meson");
  return out;
}

/** Trabajos del proyecto (sin repetir, lo principal primero). Si no hay ítems, se usa el tipo guardado. */
export function detectWorks(items: QuoteItemLike[], fallbackWorkType?: string | null): WorkKind[] {
  const set = new Set<WorkKind>();
  for (const it of items) for (const w of worksOfItem(it)) set.add(w);
  // La cocina completa ya incluye isla y muebles: no repetirlos
  if (set.has("cocina")) { set.delete("muebles_cocina"); }
  if (set.size > 1) set.delete("meson");
  if (!set.size) {
    const f = norm(fallbackWorkType);
    const k = (f === "puerta" ? "puertas" : f) as WorkKind;
    set.add(WORK_KINDS[k] ? k : "cocina");
  }
  return ORDER.filter((k) => set.has(k));
}

/** "Isla, mueble de baño y closet" */
export function worksLabel(works: WorkKind[]): string {
  const labels = works.map((w, i) => (i === 0 ? WORK_KINDS[w].label : WORK_KINDS[w].label.toLowerCase()));
  if (labels.length <= 1) return labels[0] || "";
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

export const worksGroups = (works: WorkKind[]): WorkGroup[] =>
  Array.from(new Set(works.map((w) => WORK_KINDS[w].group)));

/**
 * Tipo que se guarda en el proyecto al crearlo desde una cotización (la BD solo admite estos 4).
 * Antes: "otro", "herrajes", "mesones" → siempre "cocina"; y "puerta" no se reconocía en una de las dos rutas.
 */
export function projectWorkTypeFor(productType: string | null | undefined, items: QuoteItemLike[]): "cocina" | "closet" | "puertas" | "centro_tv" {
  const p = norm(productType);
  if (p === "cocina" || p === "mueble_cocina") return "cocina";
  if (p === "closet") return "closet";
  if (p === "puerta" || p === "puertas") return "puertas";
  if (p === "centro_tv") return "centro_tv";
  for (const w of detectWorks(items)) {
    const g = WORK_KINDS[w].group;
    if (g === "cocina") return "cocina";
    if (g === "closet") return "closet";
    if (g === "puertas") return "puertas";
    if (g === "centro_tv") return "centro_tv";
  }
  return "cocina";
}

// ── Trabajos históricos del Portafolio (anteriores al CRM) ──────────────────

/** Tipos que se pueden crear como histórico (sin datos del cliente). */
export const HISTORIC_KINDS: WorkKind[] = ["cocina", "closet", "mueble_bano", "puertas", "centro_tv", "escaleras", "empresas", "isla"];

/** Trabajos de un histórico guardados como "cocina,closet" → ["cocina", "closet"] (en orden y sin repetir). */
export function parseHistoricKinds(text?: string | null): WorkKind[] {
  const set = new Set((text || "").split(",").map((s) => s.trim()).filter((s) => (WORK_KINDS as any)[s]) as WorkKind[]);
  const ordered = ORDER.filter((k) => set.has(k));
  return ordered.length ? ordered : ["cocina"];
}

/** "Cocina histórica 3" / "Closet histórico 1" / "Puertas históricas 2". */
export function historicName(kind: WorkKind, n: number): string {
  const k = WORK_KINDS[kind] || WORK_KINDS.cocina;
  const adj = `históric${k.fem ? "a" : "o"}${k.plural ? "s" : ""}`;
  const base = kind === "cocina" ? "Cocina" : k.label;
  return `${base} ${adj} ${n}`;
}
