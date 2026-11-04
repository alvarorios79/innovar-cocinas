// Plano de módulos de la cocina integral — lógica pura (sin React, sin imports).
// Etapa 1: solo calcula módulos, metros y piezas de pintura. NO cambia precios ni el PDF.
// Se guarda en kitchenConfig.modulePlan (JSON). Si no existe o enabled=false, no afecta nada.

export type PlanRow = "upper" | "lower";

export interface Pieces {
  up?: number; // puertas superiores (incluye laterales y pantallas de tamaño superior)
  lo?: number; // puertas inferiores
  al?: number; // puertas de alacena / altas
  ca?: number; // tapas de cajón
  es?: number; // tapas de especiero
  go?: number; // golas (incluye frente pequeño de cucharero)
  lat?: number; // laterales grandes (de nicho de nevera / alacena): pieza grande, se cobra aparte
}

export interface CatalogEntry {
  key: string;
  label: string;
  short: string;
  row: PlanRow;
  width: number;          // medida normal (m)
  locked?: boolean;       // inamovible: no se cambia su ancho
  min?: number;           // ancho mínimo funcional
  max?: number;           // ancho máximo habitual
  flexible?: boolean;     // módulo de ajuste (se puede cambiar el ancho)
  lastResort?: boolean;   // último que se toca
  corner?: boolean;       // ocupa ancho en las dos paredes del vértice
  noPieces?: boolean;     // no es mueble (ej. ventana)
  pieces: (w: number, m?: PlanModule) => Pieces;
}

// Regla de puertas: lo ideal es 0.30–0.35 m por puerta y nunca más de 0.45 m.
export function doorsForWidth(w: number): number {
  if (w <= 0.45 + 1e-9) return 1;
  if (w <= 0.80 + 1e-9) return 2;
  if (w <= 1.15 + 1e-9) return 3;
  return 4;
}

// El orden de esta lista es el orden en que se muestran los módulos al armar la cocina.
export const CATALOG: CatalogEntry[] = [
  // ── Inferiores ──
  { key: "moduloEstufaPuerta", label: "Estufa (puerta)", short: "Estufa", row: "lower", width: 0.70, locked: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "moduloEstufaHorno", label: "Estufa y horno", short: "Estufa+horno", row: "lower", width: 0.70, locked: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "moduloLavaplatos", label: "Lavaplatos", short: "Lavaplatos", row: "lower", width: 0.70, locked: true, pieces: () => ({ lo: 2, go: 1 }) },
  { key: "moduloLavaplatosDoble", label: "Lavaplatos doble (0.85–0.95)", short: "Lavap. doble", row: "lower", width: 0.90, min: 0.85, max: 0.95, pieces: () => ({ lo: 2, go: 1 }) }, // siempre 2 puertas: ahí van las conexiones de plomería
  { key: "cajoneroTriple", label: "Cajonero triple", short: "Caj. triple", row: "lower", width: 0.70, pieces: () => ({ ca: 2, go: 3 }) },
  { key: "cajoneroDoble", label: "Cajonero doble", short: "Caj. doble", row: "lower", width: 0.60, pieces: () => ({ ca: 2, go: 2 }) },
  { key: "basurero", label: "Basurero integrado", short: "Basurero", row: "lower", width: 0.50, flexible: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "especiero", label: "Especiero", short: "Especiero", row: "lower", width: 0.25, flexible: true, pieces: () => ({ es: 1, go: 1 }) },
  { key: "botellero", label: "Botellero", short: "Botellero", row: "lower", width: 0.35, flexible: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "moduloAlmacInf", label: "Almacenamiento inferior", short: "Alm. inf.", row: "lower", width: 0.60, flexible: true, pieces: (w) => ({ lo: doorsForWidth(w), go: 1 }) },
  { key: "esquinero1x1", label: "Esquinero inferior 1×1", short: "Esq. inf.", row: "lower", width: 1.00, min: 0.85, lastResort: true, corner: true, pieces: () => ({ lo: 2 }) },
  // ── Superiores ──
  { key: "moduloExtractor", label: "Extractor", short: "Extractor", row: "upper", width: 0.70, locked: true, pieces: () => ({}) },
  { key: "moduloPlatero", label: "Platero (0.70–0.90)", short: "Platero", row: "upper", width: 0.70, min: 0.70, max: 0.90, pieces: () => ({ up: 2 }) }, // siempre 2 puertas, para conservar las líneas con el lavaplatos
  { key: "moduloExtractorMicroondas", label: "Extractor y microondas", short: "Extr.+micro.", row: "upper", width: 0.70, locked: true, pieces: () => ({ up: 4 }) },
  { key: "moduloMicroondas", label: "Microondas", short: "Microondas", row: "upper", width: 0.60, pieces: () => ({}) },
  { key: "moduloAlmacSup", label: "Almacenamiento superior", short: "Alm. sup.", row: "upper", width: 0.65, flexible: true, pieces: (w) => ({ up: doorsForWidth(w), go: 1 }) },
  { key: "moduloRepisa", label: "Espacio de repisas", short: "Repisas", row: "upper", width: 0.30, min: 0.20, flexible: true, pieces: (_w, m) => ({ up: Math.max(0, Math.floor(m?.qty || 0)) }) },
  { key: "esquineroSuperior", label: "Esquinero superior (0.60×0.60)", short: "Esq. sup.", row: "upper", width: 0.60, locked: true, corner: true, pieces: () => ({ up: 1 }) },
  { key: "ventana", label: "Ventana (sin mueble)", short: "Ventana", row: "upper", width: 1.00, noPieces: true, pieces: () => ({}) },
];

export const CATALOG_BY_KEY: Record<string, CatalogEntry> = Object.fromEntries(CATALOG.map(c => [c.key, c]));

// Módulos de ajuste que sirven para "completar" los metros que sobran, por fila.
export const FILL_KEYS: Record<PlanRow, string[]> = {
  upper: ["moduloAlmacSup"],
  lower: ["moduloAlmacInf", "botellero", "especiero", "basurero"],
};

// Módulos especiales de piso a techo (ya vienen marcados en kitchenConfig.specialModules).
//  - nichos: puerta batiente superior + lateral (el lateral se puede quitar)
//  - alacenas: una puerta de 0.50 m + lateral según ubicación (se marca)
//  - torre de hornos: tapa de cajón, gola, pantalla y 2 puertas de tamaño de mueble superior
export interface SpecialEntry { key: string; label: string; detail: string; width: number; editable?: boolean; pieces: Pieces; lateral?: { class: "lat"; defaultOn: boolean } }
export const SPECIALS: SpecialEntry[] = [
  { key: "nichoNevecon", label: "Nicho nevecón", detail: "puerta batiente superior", width: 1.00, pieces: { up: 1 }, lateral: { class: "lat", defaultOn: true } },
  { key: "nichoNevera", label: "Nicho nevera", detail: "puerta batiente superior", width: 0.75, pieces: { up: 1 }, lateral: { class: "lat", defaultOn: true } },
  { key: "alacenaEntrepanos", label: "Alacena con entrepaños", detail: "1 puerta", width: 0.50, editable: true, pieces: { al: 1 }, lateral: { class: "lat", defaultOn: false } },
  { key: "alacenaHerraje", label: "Alacena con herraje", detail: "1 puerta de 0.50 m", width: 0.50, pieces: { al: 1 }, lateral: { class: "lat", defaultOn: false } },
  { key: "torreHornos", label: "Torre de hornos", detail: "tapa de cajón, gola, pantalla y 2 puertas", width: 0.70, pieces: { up: 3, ca: 1, go: 1 } },
];

export interface PlanModule {
  id: string; key: string; width: number; unpainted?: boolean; alsoTramo?: number;
  // Módulos superiores que se crearon solos a partir de uno inferior:
  autoOf?: string[];     // ids de los inferiores de los que depende
  autoBase?: number;     // ancho = suma de los inferiores − autoBase (solo almacenamiento automático)
  autoGroup?: "small";   // agrupa basurero/especiero/botellero consecutivos
  autoRole?: "cornerFill"; // almacenamiento que compensa el esquinero (suma los pequeños pegados al esquinero)
  paint?: boolean;       // forzar pintado / sin pintar solo este módulo
  qty?: number;          // cantidad de piezas que indica el usuario (ej. repisas)
  autoClamp?: [number, number]; // el ancho automático se limita a este rango (platero 0.70–0.90)
  gap?: number;          // espacio libre (m) entre el elemento anterior y este módulo
}
export interface PlanTramo { name: string; length: number; isIsland?: boolean; upper: PlanModule[]; lower: PlanModule[] }
export interface PlanExtras { latSup: number; latInf: number; latNevera: number; puertaAlta: number; especiales: number }
export interface ModulePlan {
  enabled: boolean;
  tramos: PlanTramo[];
  specialTramo?: Record<string, number>;
  specialLateral?: Record<string, boolean>;
  alacenaEntrepanosWidth?: number;
  paintAll?: boolean;
  autoUpper?: boolean;   // al agregar un inferior, agregar su superior (por defecto sí)
  suppress?: string[];   // superiores automáticos que el usuario quitó a propósito ("idInferior:clave")
  specialPos?: Record<string, { u: number; l: number; ou?: number; ol?: number; gu?: number; gl?: number }>; // posición (índice) de cada módulo de piso a techo en cada fila
  defaultWidth?: Record<string, number>;               // ancho que el usuario eligió por tipo de módulo
  paintRows?: { upper?: boolean; lower?: boolean };   // ¿van pintados los superiores / inferiores?
  paintKeys?: Record<string, boolean>;                // por tipo de módulo (ej. todos los cajoneros)
  extras: PlanExtras;
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100 + 1e-9) / 100;
export const newId = () => Math.random().toString(36).slice(2, 8);

export function layoutTramoNames(layout?: string): string[] {
  switch (layout) {
    case "L": return ["Pared A", "Pared B"];
    case "U": return ["Pared A", "Pared B", "Pared C"];
    case "cuadrada": return ["Pared A", "Pared B"];
    default: return ["Pared A"]; // lineal, isla, otra, sin definir
  }
}

const emptyExtras = (): PlanExtras => ({ latSup: 0, latInf: 0, latNevera: 0, puertaAlta: 0, especiales: 0 });

// Asegura que el plan tenga los tramos que corresponden a la forma de la cocina (sin perder lo ya armado).
export function normalizePlan(raw: any, config: any): ModulePlan {
  const base: ModulePlan = raw && typeof raw === "object" ? raw : { enabled: false, tramos: [], extras: emptyExtras() };
  const names = layoutTramoNames(config?.layout);
  const wantIsland = !!(config?.island?.enabled && (config.island.meters || 0) > 0);
  const tramos: PlanTramo[] = names.map((name, i) => {
    const prev = base.tramos?.[i] && !base.tramos[i].isIsland ? base.tramos[i] : undefined;
    const defaultLen = i === 0 && names.length === 1
      ? ((config?.independentMeters && config?.lowerMeters) ? config.lowerMeters : (config?.totalMeters || 0))
      : 0;
    return prev
      ? { ...prev, name }
      : { name, length: round2(defaultLen), upper: [], lower: [] };
  });
  if (wantIsland) {
    const prevI = (base.tramos || []).find(t => t.isIsland);
    tramos.push(prevI ? { ...prevI, name: "Isla" } : { name: "Isla", length: round2(config.island.meters), isIsland: true, upper: [], lower: [] });
  }
  // Los vértices (alsoTramo) deben apuntar a un tramo que exista
  tramos.forEach(t => {
    (["upper", "lower"] as PlanRow[]).forEach(r => {
      t[r] = (t[r] || []).map(m => (m.alsoTramo !== undefined && (m.alsoTramo >= tramos.length || tramos[m.alsoTramo]?.isIsland)) ? { ...m, alsoTramo: undefined } : m);
    });
  });
  return {
    enabled: !!base.enabled,
    tramos,
    specialTramo: base.specialTramo || {},
    specialLateral: base.specialLateral || {},
    alacenaEntrepanosWidth: base.alacenaEntrepanosWidth,
    paintAll: base.paintAll !== false,
    specialPos: base.specialPos || {},
    defaultWidth: base.defaultWidth || {},
    paintRows: base.paintRows || {},
    paintKeys: base.paintKeys || {},
    suppress: base.suppress || [],
    autoUpper: base.autoUpper !== false,
    extras: { ...emptyExtras(), ...(base.extras || {}) },
  };
}

export function specialWidth(plan: ModulePlan, key: string): number {
  const s = SPECIALS.find(x => x.key === key)!;
  return key === "alacenaEntrepanos" ? (plan.alacenaEntrepanosWidth ?? s.width) : s.width;
}

export function lateralOn(plan: ModulePlan, key: string): boolean {
  const s = SPECIALS.find(x => x.key === key);
  if (!s?.lateral) return false;
  const v = plan.specialLateral?.[key];
  return v === undefined ? s.lateral.defaultOn : !!v;
}

export function activeSpecials(plan: ModulePlan, config: any): Array<SpecialEntry & { tramo: number; w: number }> {
  const sm = config?.specialModules || {};
  return SPECIALS.filter(s => !!sm[s.key]).map(s => ({
    ...s,
    w: specialWidth(plan, s.key),
    tramo: Math.min(plan.specialTramo?.[s.key] ?? 0, Math.max(0, plan.tramos.length - 1)),
  }));
}

// ── Edición del plan (funciones puras sobre una copia) ─────────────────────

const isTrailingCorner = (m?: PlanModule) => !!m && !!CATALOG_BY_KEY[m.key]?.corner && m.alsoTramo !== undefined;
const SMALL_KEYS = ["basurero", "especiero", "botellero"];

// El esquinero que sigue a la pared siguiente (y su almacenamiento de compensación) quedan siempre al final de su tramo.
function insertBeforeTrailingBlock(arr: PlanModule[], mod: PlanModule) {
  let idx = arr.length;
  if (isTrailingCorner(arr[idx - 1])) { idx -= 1; if (arr[idx - 1]?.autoRole === "cornerFill") idx -= 1; }
  if (isTrailingCorner(mod) || mod.autoRole === "cornerFill") arr.push(mod);
  else arr.splice(idx, 0, mod);
}

// Genera los superiores que corresponden a la fila inferior, en el mismo orden:
// lavaplatos→platero, estufa→extractor, cajonero/almacenamiento→almacenamiento,
// basurero/especiero/botellero seguidos→un almacenamiento (si están pegados al esquinero, se suman a la compensación del esquinero).
function genAutoUppers(p: ModulePlan, t: number): PlanModule[] {
  const tr = p.tramos[t];
  const sup = new Set(p.suppress || []);
  const out: PlanModule[] = [];
  const mk = (key: string, width: number, autoOf: string[], extra: Partial<PlanModule> = {}): PlanModule => ({ id: newId(), key, width: round2(width), autoOf, ...extra });
  let pending: PlanModule[] = [];
  const flush = () => {
    if (!pending.length) return;
    const ids = pending.map(m => m.id);
    if (!ids.every(id => sup.has(id + ":moduloAlmacSup"))) out.push(mk("moduloAlmacSup", pending.reduce((a, m) => a + m.width, 0), ids, { autoBase: 0, autoGroup: "small" }));
    pending = [];
  };
  for (const m of tr.lower) {
    if (SMALL_KEYS.includes(m.key)) { pending.push(m); continue; }
    if (m.key === "esquinero1x1") {
      const ids = [...pending.map(x => x.id), m.id];
      const sum = pending.reduce((a, x) => a + x.width, 0) + m.width;
      pending = [];
      if (!sup.has(m.id + ":cornerFill") && sum - 0.60 > 0.01) out.push(mk("moduloAlmacSup", sum - 0.60, ids, { autoBase: 0.60, autoRole: "cornerFill" }));
      if (!sup.has(m.id + ":esquineroSuperior")) out.push(mk("esquineroSuperior", 0.60, [m.id], { alsoTramo: m.alsoTramo }));
      continue;
    }
    flush();
    const add = (key: string, w: number, extra: Partial<PlanModule> = {}) => { if (!sup.has(m.id + ":" + key)) out.push(mk(key, w, [m.id], extra)); };
    switch (m.key) {
      case "moduloLavaplatos":
      case "moduloLavaplatosDoble":
        // El platero toma el ancho del lavaplatos, entre 0.70 y 0.90 (si es distinto se resuelve en el diseño definitivo)
        add("moduloPlatero", Math.min(0.90, Math.max(0.70, m.width)), { autoBase: 0, autoClamp: [0.70, 0.90] });
        break;
      case "moduloEstufaPuerta":
      case "moduloEstufaHorno": add("moduloExtractor", 0.70); break;
      case "cajoneroTriple":
      case "cajoneroDoble":
      case "moduloAlmacInf": add("moduloAlmacSup", m.width, { autoBase: 0 }); break;
    }
  }
  flush();
  return out;
}

const autoSig = (m: PlanModule) => (m.autoOf || []).join(",") + ":" + m.key + ":" + (m.autoRole || "");

// Rehace los superiores automáticos de un tramo; conserva los que puso el usuario a mano (ventana, repisas, etc.)
// en la misma posición relativa y recuerda cuáles estaban sin pintar.
export function rebuildAutoUpper(p: ModulePlan, t: number) {
  const tr = p.tramos[t];
  if (!tr || tr.isIsland || p.autoUpper === false) return;
  const old = tr.upper;
  const fresh = genAutoUppers(p, t);
  const freshBySig = new Map(fresh.map(m => [autoSig(m), m]));

  // 1) Se conserva el orden actual de la fila (incluido lo que el usuario movió a mano)
  const result: PlanModule[] = [];
  old.forEach(m => {
    if (!m.autoOf) { result.push(m); return; }                 // a mano: se queda
    const f = freshBySig.get(autoSig(m));
    if (f) result.push({ ...m, width: f.width, autoBase: f.autoBase, autoGroup: f.autoGroup, autoRole: f.autoRole, autoClamp: f.autoClamp, alsoTramo: f.alsoTramo });
  });
  // 2) Los superiores nuevos se insertan detrás del que les antecede en el orden de los inferiores
  fresh.forEach((f, i) => {
    const sig = autoSig(f);
    if (result.some(m => m.autoOf && autoSig(m) === sig)) return;
    const prev = i > 0 ? fresh[i - 1] : undefined;
    const prevIdx = prev ? result.findIndex(m => m.autoOf && autoSig(m) === autoSig(prev)) : -1;
    result.splice(prevIdx >= 0 ? prevIdx + 1 : 0, 0, f);
  });
  // 3) El esquinero (y su compensación) siempre al final de la pared
  const tail: PlanModule[] = [];
  const corner = result.find(m => isTrailingCorner(m) && m.autoOf);
  if (corner) {
    const ci = result.indexOf(corner);
    const fillIdx = result.findIndex(m => m.autoRole === "cornerFill");
    [fillIdx >= 0 ? result[fillIdx] : undefined, result[ci]].forEach(x => { if (x) tail.push(x); });
    tr.upper = [...result.filter(m => !tail.includes(m)), ...tail];
  } else {
    tr.upper = result;
  }
  syncAuto(p);
}

// Recalcula el ancho de los almacenamientos automáticos (suma de sus inferiores − base).
export function syncAuto(p: ModulePlan) {
  p.tramos.forEach(tr => {
    const lowerById = new Map(tr.lower.map(m => [m.id, m]));
    tr.upper = tr.upper.filter(m => {
      if (m.autoBase === undefined || !m.autoOf) return true;
      const sum = m.autoOf.reduce((a, id) => a + (lowerById.get(id)?.width || 0), 0);
      let w = sum - m.autoBase;
      if (m.autoClamp) w = Math.min(m.autoClamp[1], Math.max(m.autoClamp[0], w));
      m.width = round2(w);
      return m.width > 0.01;
    });
  });
}

export function addModuleToPlan(p: ModulePlan, t: number, row: PlanRow, key: string): PlanModule | undefined {
  const cat = CATALOG_BY_KEY[key];
  if (!cat || !p.tramos[t]) return undefined;
  const mod: PlanModule = { id: newId(), key, width: (!cat.locked && p.defaultWidth?.[key]) || cat.width };
  if (cat.corner && t + 1 < p.tramos.length && !p.tramos[t + 1].isIsland && !p.tramos[t].isIsland) mod.alsoTramo = t + 1;
  insertBeforeTrailingBlock(p.tramos[t][row], mod);
  if (row === "lower") rebuildAutoUpper(p, t);
  return mod;
}

export function removeModuleFromPlan(p: ModulePlan, t: number, row: PlanRow, id: string) {
  const tr = p.tramos[t];
  if (row === "upper") {
    const m = tr.upper.find(x => x.id === id);
    if (m?.autoOf) {
      // el usuario quitó un superior automático a propósito: que no vuelva a aparecer solo
      const sup = new Set(p.suppress || []);
      if (m.autoRole === "cornerFill") sup.add(m.autoOf[m.autoOf.length - 1] + ":cornerFill");
      else m.autoOf.forEach(oid => sup.add(oid + ":" + m.key));
      p.suppress = Array.from(sup);
    }
    tr.upper = tr.upper.filter(x => x.id !== id);
    return;
  }
  tr.lower = tr.lower.filter(m => m.id !== id);
  p.suppress = (p.suppress || []).filter(s => !s.startsWith(id + ":"));
  rebuildAutoUpper(p, t);
}

export function setModuleWidth(p: ModulePlan, t: number, row: PlanRow, id: string, w: number) {
  const m = p.tramos[t][row].find(x => x.id === id);
  if (m) m.width = round2(w);
  if (row === "lower") rebuildAutoUpper(p, t);
}

export function moveModule(p: ModulePlan, t: number, row: PlanRow, id: string, toIndex: number) {
  const arr = p.tramos[t][row];
  const i = arr.findIndex(x => x.id === id);
  if (i < 0) return;
  const [m] = arr.splice(i, 1);
  delete m.gap;
  arr.splice(Math.max(0, Math.min(toIndex, arr.length)), 0, m);
  // Mover un inferior NO mueve su superior: el usuario reacomoda ambos a mano.
}

// ¿Va pintado este módulo? Prioridad: el propio módulo > su tipo (ej. todos los cajoneros) > la fila (superiores/inferiores).
export function isPainted(plan: ModulePlan, m: PlanModule, row: PlanRow): boolean {
  if (m.paint !== undefined) return m.paint;
  if (m.unpainted) return false;
  const byKey = plan.paintKeys?.[m.key];
  if (byKey !== undefined) return byKey;
  const byRow = plan.paintRows?.[row];
  if (byRow !== undefined) return byRow;
  return plan.paintAll !== false;
}

// ── Cálculo ────────────────────────────────────────────────────────────────

// Elementos de una fila en un tramo, en orden y con su posición (m desde el inicio de la pared):
// primero los vértices que vienen del tramo anterior, luego los propios y los módulos de piso a techo (que cruzan las dos filas).
export interface RowItem {
  kind: "mod" | "tall";
  key: string;
  width: number;
  start: number;
  fromPrev: boolean;
  ownIndex: number;       // posición entre los módulos propios de la fila (-1 si no aplica)
  mod?: PlanModule;
  special?: SpecialEntry & { tramo: number; w: number };
}

function trailingBlockSize(arr: PlanModule[]): number {
  let n = 0;
  if (isTrailingCorner(arr[arr.length - 1])) { n = 1; if (arr[arr.length - 2]?.autoRole === "cornerFill") n = 2; }
  return n;
}

// Índice (entre los módulos propios de la fila) donde está un módulo de piso a techo.
export function tallPos(plan: ModulePlan, t: number, row: PlanRow, key: string): number {
  const own = plan.tramos[t]?.[row] || [];
  const maxIdx = own.length - trailingBlockSize(own);
  const st = plan.specialPos?.[key];
  const v = st ? (row === "upper" ? st.u : st.l) : maxIdx;
  return Math.max(0, Math.min(v, maxIdx));
}

export function rowItems(plan: ModulePlan, t: number, row: PlanRow, config: any): RowItem[] {
  const out: RowItem[] = [];
  let pos = 0;
  plan.tramos.forEach((tr, i) => {
    if (i === t) return;
    (tr[row] || []).forEach(m => {
      if (m.alsoTramo === t) { out.push({ kind: "mod", key: m.key, width: m.width, start: pos, fromPrev: true, ownIndex: -1, mod: m }); pos += m.width; }
    });
  });
  const own = plan.tramos[t]?.[row] || [];
  const talls = activeSpecials(plan, config).filter(s => s.tramo === t).map(s => ({ s, idx: tallPos(plan, t, row, s.key), ord: tallOrd(plan, t, row, s.key) }));
  for (let i = 0; i <= own.length; i++) {
    talls.filter(x => x.idx === i).sort((a, b) => a.ord - b.ord).forEach(x => {
      pos += tallGap(plan, row, x.s.key);
      out.push({ kind: "tall", key: x.s.key, width: x.s.w, start: pos, fromPrev: false, ownIndex: -1, special: x.s }); pos += x.s.w;
    });
    if (i < own.length) {
      const m = own[i];
      pos += Math.max(0, m.gap || 0);
      out.push({ kind: "mod", key: m.key, width: m.width, start: pos, fromPrev: false, ownIndex: i, mod: m }); pos += m.width;
    }
  }
  return out;
}

export function rowUsed(plan: ModulePlan, t: number, row: PlanRow, config: any): number {
  return round2(rowItems(plan, t, row, config).reduce((a, s) => Math.max(a, s.start + s.width), 0));
}

// Espacio libre antes de un módulo de piso a techo en una fila.
export function tallGap(plan: ModulePlan, row: PlanRow, key: string): number {
  const st = plan.specialPos?.[key];
  return Math.max(0, (row === "upper" ? st?.gu : st?.gl) || 0);
}

// Orden entre módulos de piso a techo que caen en el mismo lugar de la fila.
export function tallOrd(plan: ModulePlan, _t: number, row: PlanRow, key: string): number {
  const st = plan.specialPos?.[key];
  const v = row === "upper" ? st?.ou : st?.ol;
  return v ?? 1000 + SPECIALS.findIndex(s => s.key === key);
}

type OwnEl = { kind: "mod"; mod: PlanModule } | { kind: "tall"; key: string };

// Lista ordenada de los elementos propios de una fila (módulos y módulos de piso a techo).
function ownList(plan: ModulePlan, t: number, row: PlanRow, config: any): OwnEl[] {
  const own = plan.tramos[t]?.[row] || [];
  const talls = activeSpecials(plan, config).filter(s => s.tramo === t).map(s => ({ key: s.key, idx: tallPos(plan, t, row, s.key), ord: tallOrd(plan, t, row, s.key) }));
  const out: OwnEl[] = [];
  for (let i = 0; i <= own.length; i++) {
    talls.filter(x => x.idx === i).sort((a, b) => a.ord - b.ord).forEach(x => out.push({ kind: "tall", key: x.key }));
    if (i < own.length) out.push({ kind: "mod", mod: own[i] });
  }
  return out;
}

// Guarda en el plan la posición de todos los módulos de piso a techo según una lista ordenada.
function saveList(p: ModulePlan, row: PlanRow, list: OwnEl[], config: any) {
  let mods = 0, ord = 0;
  const all = p.specialPos || {};
  list.forEach(el => {
    if (el.kind === "mod") { mods++; return; }
    const sp = activeSpecials(p, config).find(s => s.key === el.key);
    const cur = all[el.key] || { u: tallPos(p, sp?.tramo ?? 0, "upper", el.key), l: tallPos(p, sp?.tramo ?? 0, "lower", el.key) };
    all[el.key] = row === "upper" ? { ...cur, u: mods, ou: ord++ } : { ...cur, l: mods, ol: ord++ };
  });
  p.specialPos = { ...all };
}

// Mueve un módulo de piso a techo un lugar a la izquierda (-1) o a la derecha (+1) en las dos filas a la vez.
// Un "lugar" es el siguiente elemento de la fila, sea un módulo u otro módulo de piso a techo.
export function moveTall(p: ModulePlan, key: string, dir: -1 | 1, config: any) {
  const sp = activeSpecials(p, config).find(s => s.key === key);
  if (!sp) return;
  (["upper", "lower"] as PlanRow[]).forEach(row => {
    const list = ownList(p, sp.tramo, row, config);
    const pos = list.findIndex(el => el.kind === "tall" && el.key === key);
    const max = list.length - 1 - trailingBlockSize(p.tramos[sp.tramo][row]);
    const target = pos + dir;
    if (pos < 0 || target < 0 || target > max) return;
    [list[pos], list[target]] = [list[target], list[pos]];
    saveList(p, row, list, config);
  });
}

// Coloca un módulo de piso a techo donde se soltó (x en metros desde el inicio de la pared), en las dos filas.
export function placeTall(p: ModulePlan, key: string, x: number, config: any) {
  const sp = activeSpecials(p, config).find(s => s.key === key);
  if (!sp) return;
  const widthOf = (el: OwnEl) => el.kind === "mod" ? el.mod.width : (activeSpecials(p, config).find(s => s.key === el.key)?.w || 0);
  (["upper", "lower"] as PlanRow[]).forEach(row => {
    const prefix = rowItems(p, sp.tramo, row, config).filter(i => i.fromPrev).reduce((a, i) => a + i.width, 0);
    const list = ownList(p, sp.tramo, row, config).filter(el => !(el.kind === "tall" && el.key === key));
    let pos = prefix, at = 0;
    for (const el of list) { const w = widthOf(el); if (pos + w / 2 < x) at++; pos += w; }
    const max = list.length - trailingBlockSize(p.tramos[sp.tramo][row]);
    list.splice(Math.max(0, Math.min(at, max)), 0, { kind: "tall", key });
    saveList(p, row, list, config);
  });
}

type DropTarget = { kind: "mod"; id: string } | { kind: "tall"; key: string };

// Coloca un elemento (módulo o módulo de piso a techo) con su borde izquierdo en `start` (m desde el inicio de la pared) en UNA fila.
// Los demás elementos no se mueven: el lugar que deja se vuelve espacio libre y, si el destino está libre, el elemento queda ahí.
// Solo si el hueco es más pequeño que el elemento se empujan los vecinos hacia la derecha.
function dropInRow(p: ModulePlan, t: number, row: PlanRow, target: DropTarget, start: number, config: any, cuts: number[]) {
  const arr = p.tramos[t][row];
  let list = ownList(p, t, row, config);
  const isTarget = (el: OwnEl) => target.kind === "mod" ? (el.kind === "mod" && el.mod.id === target.id) : (el.kind === "tall" && el.key === target.key);
  const idx0 = list.findIndex(isTarget);
  if (idx0 < 0) return;
  const widthOf = (el: OwnEl) => el.kind === "mod" ? el.mod.width : (activeSpecials(p, config).find(s => s.key === el.key)?.w || 0);
  const gapOf = (el: OwnEl) => el.kind === "mod" ? Math.max(0, el.mod.gap || 0) : tallGap(p, row, el.key);
  const setGap = (el: OwnEl, g: number) => {
    g = round2(Math.max(0, g));
    if (el.kind === "mod") { if (g > 0) el.mod.gap = g; else delete el.mod.gap; }
    else {
      const sp = activeSpecials(p, config).find(s => s.key === el.key);
      const cur = p.specialPos?.[el.key] || { u: tallPos(p, sp?.tramo ?? 0, "upper", el.key), l: tallPos(p, sp?.tramo ?? 0, "lower", el.key) };
      p.specialPos = { ...(p.specialPos || {}), [el.key]: row === "upper" ? { ...cur, gu: g } : { ...cur, gl: g } };
    }
  };
  const el = list[idx0];
  const w = widthOf(el);
  // 1) sacar el elemento: su lugar pasa a ser espacio libre del siguiente
  const next0 = list[idx0 + 1];
  if (next0) setGap(next0, gapOf(next0) + w + gapOf(el));
  list = list.filter((_, i) => i !== idx0);
  // 2) posiciones actuales de los demás
  const prefix = rowItems(p, t, row, config).filter(i => i.fromPrev).reduce((a, i) => a + i.width, 0);
  const starts: number[] = [], ends: number[] = [];
  let pos = prefix;
  list.forEach(e => { pos += gapOf(e); starts.push(pos); pos += widthOf(e); ends.push(pos); });
  // 3) imán a cortes cercanos (borde izquierdo o derecho) y al inicio de la pared
  let s = Math.max(prefix, start);
  const snaps = [prefix, ...ends, ...cuts];
  let best = 0.07;
  snaps.forEach(c => {
    if (Math.abs(s - c) < best) { best = Math.abs(s - c); s = c; }
    else if (Math.abs(s + w - c) < best) { best = Math.abs(s + w - c); s = c - w; }
  });
  s = Math.max(prefix, s);
  // 4) lugar en el orden: según el centro
  const trailing = trailingBlockSize(arr);
  const center = s + w / 2;
  let at = 0;
  list.forEach((e, i) => { if (starts[i] + widthOf(e) / 2 < center) at = i + 1; });
  at = Math.max(0, Math.min(at, list.length - trailing));
  // El esquinero del final (y su compensación) conservan su lugar al final de la pared
  if (el.kind === "mod") {
    const lastEl = list[list.length - 1];
    if (isTrailingCorner(el.mod)) at = list.length;
    else if (el.mod.autoRole === "cornerFill" && lastEl?.kind === "mod" && isTrailingCorner(lastEl.mod)) at = list.length - 1;
  }
  // 5) acomodar en el hueco
  const prevEnd = at > 0 ? ends[at - 1] : prefix;
  const nextStart = at < list.length ? starts[at] : Infinity;
  const tl = p.tramos[t].length;
  // Límite derecho: el siguiente elemento o, si es el último, el largo de la pared
  const limit = at < list.length ? nextStart : (tl > 0 && tl >= prevEnd + w - 1e-9 ? tl : Infinity);
  const hole = limit - prevEnd;
  const fits = hole >= w - 1e-9;
  if (fits) {
    s = Math.min(Math.max(s, prevEnd), limit - w);
    // Imán: si queda a menos de 0.30 m de su vecino (o del tope de la pared), se pega
    const MAG = 0.30;
    const left = s - prevEnd, right = limit - (s + w);
    if (left <= MAG && (right > MAG || left <= right)) s = prevEnd;
    else if (right <= MAG && isFinite(limit)) s = limit - w;
  } else s = prevEnd;
  const nextEl = list[at];
  if (nextEl) setGap(nextEl, fits ? nextStart - (s + w) : 0);
  setGap(el, s - prevEnd);
  list.splice(at, 0, el);
  saveList(p, row, list, config);
  // 6) el arreglo de módulos propios debe reflejar el nuevo orden
  if (target.kind === "mod") {
    const mods = list.filter((e): e is Extract<OwnEl, { kind: "mod" }> => e.kind === "mod").map(e => e.mod);
    const tailMods = arr.filter(m => !mods.includes(m));
    p.tramos[t][row] = [...mods, ...tailMods];
  }
}

// Mueve un módulo a la posición `start` (m) de su fila sin afectar a los demás.
export function dropModule(p: ModulePlan, t: number, row: PlanRow, id: string, start: number, config: any) {
  const other: PlanRow = row === "upper" ? "lower" : "upper";
  const cuts = rowItems(p, t, other, config).map(i => round2(i.start + i.width));
  dropInRow(p, t, row, { kind: "mod", id }, start, config, cuts);
}

// Mueve un módulo de piso a techo a la posición `start` (m) en las dos filas a la vez.
export function dropTall(p: ModulePlan, key: string, start: number, config: any) {
  const sp = activeSpecials(p, config).find(s => s.key === key);
  if (!sp) return;
  (["upper", "lower"] as PlanRow[]).forEach(row => dropInRow(p, sp.tramo, row, { kind: "tall", key }, start, config, []));
}

// Ancho de todos los módulos de un tipo en una fila de un tramo (y ancho para los próximos que se agreguen).
export function setTypeWidth(p: ModulePlan, t: number, row: PlanRow, key: string, w: number) {
  const cat = CATALOG_BY_KEY[key];
  if (!cat || cat.locked) return;
  p.defaultWidth = { ...(p.defaultWidth || {}), [key]: round2(w) };
  p.tramos[t][row].forEach(m => { if (m.key === key && m.autoBase === undefined) m.width = round2(w); });
  if (row === "lower") rebuildAutoUpper(p, t);
}

// Ajusta el ancho de un módulo para que su final coincida con el corte más cercano de la otra fila.
export function alignEnd(p: ModulePlan, t: number, row: PlanRow, id: string, config: any) {
  const m = p.tramos[t][row].find(x => x.id === id);
  const cat = m && CATALOG_BY_KEY[m.key];
  if (!m || !cat || cat.locked || m.autoBase !== undefined) return;
  const mine = rowItems(p, t, row, config).find(i => i.mod?.id === id);
  if (!mine) return;
  const otherRow: PlanRow = row === "upper" ? "lower" : "upper";
  const cuts = rowItems(p, t, otherRow, config).map(i => round2(i.start + i.width));
  const end = mine.start + m.width;
  const near = cuts.filter(x => x > mine.start + 0.1).sort((a, b) => Math.abs(a - end) - Math.abs(b - end))[0];
  if (near === undefined || Math.abs(near - end) > 0.35) return;
  let w = round2(near - mine.start);
  if (cat.min) w = Math.max(cat.min, w);
  if (cat.max) w = Math.min(cat.max, w);
  setModuleWidth(p, t, row, id, w);
}

export function addPieces(acc: Required<Pieces>, p: Pieces, times = 1) {
  (Object.keys(acc) as Array<keyof Pieces>).forEach(k => { acc[k] += (p[k] || 0) * times; });
}

export interface PlanResult {
  pieces: Required<Pieces> & { special: number };
  modules: Array<{ key: string; label: string; qty: number; widths: number[] }>;
  warnings: string[];
}

export function computePlan(rawPlan: any, config: any): PlanResult {
  const plan = normalizePlan(rawPlan, config);
  const acc: Required<Pieces> = { up: 0, lo: 0, al: 0, ca: 0, es: 0, go: 0, lat: 0 };
  const counted = new Map<string, { label: string; widths: number[] }>();
  const warnings: string[] = [];

  plan.tramos.forEach((tr, t) => {
    (["upper", "lower"] as PlanRow[]).forEach(row => {
      (tr[row] || []).forEach(m => {
        const cat = CATALOG_BY_KEY[m.key];
        if (!cat) return;
        if (!cat.noPieces) {
          const e = counted.get(m.key) || { label: cat.label, widths: [] };
          e.widths.push(m.width); counted.set(m.key, e);
        }
        if (!cat.noPieces && isPainted(plan, m, row)) addPieces(acc, cat.pieces(m.width, m));
        if (m.key === "moduloRepisa" && !(m.qty && m.qty > 0)) warnings.push(`${tr.name}: indica cuántas repisas lleva el espacio de repisas.`);
        if (cat.min && m.width < cat.min - 1e-9) warnings.push(`${tr.name}: ${cat.short} no debería medir menos de ${cat.min.toFixed(2)} m.`);
        if (cat.max && m.width > cat.max + 1e-9) warnings.push(`${tr.name}: ${cat.short} normalmente no pasa de ${cat.max.toFixed(2)} m.`);
      });
      if (tr.isIsland && row === "upper") return;
      const used = rowUsed(plan, t, row, config);
      const label = `${tr.name} · ${row === "upper" ? "superiores" : "inferiores"}`;
      if (tr.length > 0 && used > tr.length + 0.005) warnings.push(`${label}: te pasas ${(used - tr.length).toFixed(2)} m del largo de la pared.`);
    });

    // Avisos: platero sobre lavaplatos y extractor sobre estufa deben coincidir
    if (!tr.isIsland) {
      const up = rowItems(plan, t, "upper", config), lo = rowItems(plan, t, "lower", config);
      const pos = (seq: RowItem[], keys: string[]) => seq.find(s => keys.includes(s.key))?.start;
      const pairs: Array<[string[], string[], string]> = [
        [["moduloPlatero"], ["moduloLavaplatos", "moduloLavaplatosDoble"], "El platero y el lavaplatos"],
        [["moduloExtractor", "moduloExtractorMicroondas"], ["moduloEstufaPuerta", "moduloEstufaHorno"], "El extractor y la estufa"],
      ];
      pairs.forEach(([a, b, msg]) => {
        const pa = pos(up, a), pb = pos(lo, b);
        if (pa !== undefined && pb !== undefined && Math.abs(pa - pb) > 0.02) warnings.push(`${tr.name}: ${msg} no quedan alineados (diferencia ${Math.abs(pa - pb).toFixed(2)} m).`);
      });
    }
  });

  // Los módulos de piso a techo deben quedar en el mismo lugar en las dos filas
  activeSpecials(plan, config).forEach(s => {
    if (plan.tramos[s.tramo]?.isIsland) return;
    const a = rowItems(plan, s.tramo, "upper", config).find(i => i.kind === "tall" && i.key === s.key)?.start;
    const b = rowItems(plan, s.tramo, "lower", config).find(i => i.kind === "tall" && i.key === s.key)?.start;
    if (a !== undefined && b !== undefined && Math.abs(a - b) > 0.02) warnings.push(`${plan.tramos[s.tramo].name}: ${s.label} no queda alineado entre superiores e inferiores (diferencia ${Math.abs(a - b).toFixed(2)} m).`);
  });

  // Especiales de piso a techo
  activeSpecials(plan, config).forEach(s => {
    if (plan.paintKeys?.[s.key] !== false) {
      addPieces(acc, s.pieces);
      if (s.lateral && lateralOn(plan, s.key)) addPieces(acc, { [s.lateral.class]: 1 });
    }
    counted.set(s.key, { label: s.label, widths: [s.w] });
  });

  // Extras (laterales, puerta alta, piezas especiales)
  const ex = plan.extras;
  acc.up += (ex.latSup || 0) + (ex.latNevera || 0);
  acc.lo += ex.latInf || 0;
  acc.al += ex.puertaAlta || 0;

  const modules = Array.from(counted.entries()).map(([key, v]) => ({ key, label: v.label, qty: v.widths.length, widths: v.widths }));
  return { pieces: { ...acc, special: ex.especiales || 0 }, modules, warnings };
}
