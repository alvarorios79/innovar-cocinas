// Plano de módulos de la cocina integral — lógica pura (sin React, sin imports).
// Etapa 1: solo calcula módulos, metros y piezas de pintura. NO cambia precios ni el PDF.
// Se guarda en kitchenConfig.modulePlan (JSON). Si no existe o enabled=false, no afecta nada.

export type PlanRow = "upper" | "lower";

export interface Pieces {
  up?: number; // puertas superiores
  lo?: number; // puertas inferiores
  al?: number; // puertas de alacena / altas
  ca?: number; // tapas de cajón
  es?: number; // tapas de especiero
  go?: number; // golas (incluye frente pequeño de cucharero)
}

export interface CatalogEntry {
  key: string;
  label: string;
  short: string;
  row: PlanRow;
  width: number;          // medida normal (m)
  locked?: boolean;       // inamovible: no se cambia su ancho
  min?: number;           // ancho mínimo funcional
  flexible?: boolean;     // módulo de ajuste (se puede cambiar el ancho)
  lastResort?: boolean;   // último que se toca
  corner?: boolean;       // ocupa ancho en las dos paredes del vértice
  noPieces?: boolean;     // no es mueble (ej. ventana)
  pieces: (w: number) => Pieces;
}

// Regla de puertas: lo ideal es 0.30–0.35 m por puerta y nunca más de 0.45 m.
export function doorsForWidth(w: number): number {
  if (w <= 0.45 + 1e-9) return 1;
  if (w <= 0.80 + 1e-9) return 2;
  if (w <= 1.15 + 1e-9) return 3;
  return 4;
}

export const CATALOG: CatalogEntry[] = [
  // ── Superiores ──
  { key: "esquineroSuperior", label: "Esquinero superior (0.60×0.60)", short: "Esq. sup.", row: "upper", width: 0.60, locked: true, corner: true, pieces: () => ({ up: 1 }) },
  { key: "moduloAlmacSup", label: "Almacenamiento superior", short: "Alm. sup.", row: "upper", width: 0.65, flexible: true, pieces: (w) => ({ up: doorsForWidth(w), go: 1 }) },
  { key: "moduloExtractor", label: "Módulo para extractor", short: "Extractor", row: "upper", width: 0.70, locked: true, pieces: () => ({}) },
  { key: "moduloMicroondas", label: "Módulo para microondas", short: "Microondas", row: "upper", width: 0.60, pieces: () => ({}) },
  { key: "moduloExtractorMicroondas", label: "Módulo extractor y microondas", short: "Extr.+micro.", row: "upper", width: 0.70, locked: true, pieces: () => ({ up: 4 }) },
  { key: "moduloRepisa", label: "Repisa (6 piezas)", short: "Repisa", row: "upper", width: 0.30, pieces: () => ({ up: 6 }) },
  { key: "moduloPlatero", label: "Platero (2 puertas)", short: "Platero", row: "upper", width: 0.70, locked: true, pieces: () => ({ up: 2 }) },
  { key: "ventana", label: "Ventana (sin mueble)", short: "Ventana", row: "upper", width: 1.00, noPieces: true, pieces: () => ({}) },
  // ── Inferiores ──
  { key: "esquinero1x1", label: "Esquinero inferior 1×1", short: "Esq. inf.", row: "lower", width: 1.00, min: 0.85, lastResort: true, corner: true, pieces: () => ({ lo: 2 }) },
  { key: "cajoneroTriple", label: "Cajonero triple", short: "Caj. triple", row: "lower", width: 0.70, pieces: () => ({ ca: 2, go: 3 }) },
  { key: "cajoneroDoble", label: "Cajonero doble", short: "Caj. doble", row: "lower", width: 0.60, pieces: () => ({ ca: 2, go: 2 }) },
  { key: "especiero", label: "Especiero", short: "Especiero", row: "lower", width: 0.25, flexible: true, pieces: () => ({ es: 1, go: 1 }) },
  { key: "botellero", label: "Botellero", short: "Botellero", row: "lower", width: 0.35, flexible: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "basurero", label: "Basurero integrado", short: "Basurero", row: "lower", width: 0.50, flexible: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "moduloLavaplatos", label: "Módulo para lavaplatos", short: "Lavaplatos", row: "lower", width: 0.70, locked: true, pieces: () => ({ lo: 2, go: 1 }) },
  { key: "moduloEstufaPuerta", label: "Módulo para estufa (puerta)", short: "Estufa", row: "lower", width: 0.70, locked: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "moduloEstufaHorno", label: "Módulo para estufa y horno", short: "Estufa+horno", row: "lower", width: 0.70, locked: true, pieces: () => ({ lo: 1, go: 1 }) },
  { key: "moduloAlmacInf", label: "Almacenamiento inferior", short: "Alm. inf.", row: "lower", width: 0.60, flexible: true, pieces: (w) => ({ lo: doorsForWidth(w), go: 1 }) },
];

export const CATALOG_BY_KEY: Record<string, CatalogEntry> = Object.fromEntries(CATALOG.map(c => [c.key, c]));

// Módulos de ajuste que sirven para "completar" los metros que sobran, por fila.
export const FILL_KEYS: Record<PlanRow, string[]> = {
  upper: ["moduloAlmacSup"],
  lower: ["moduloAlmacInf", "botellero", "especiero", "basurero"],
};

// Módulos especiales de piso a techo (ya vienen marcados en kitchenConfig.specialModules).
export interface SpecialEntry { key: string; label: string; width: number; editable?: boolean; pieces: Pieces }
export const SPECIALS: SpecialEntry[] = [
  { key: "nichoNevecon", label: "Nicho nevecón", width: 1.00, pieces: { up: 1 } },
  { key: "nichoNevera", label: "Nicho nevera", width: 0.75, pieces: { up: 1 } },
  { key: "alacenaEntrepanos", label: "Alacena con entrepaños", width: 0.50, editable: true, pieces: { al: 1 } },
  { key: "alacenaHerraje", label: "Alacena con herraje", width: 0.50, pieces: { al: 1 } },
  { key: "torreHornos", label: "Torre de hornos", width: 0.70, pieces: { up: 1, ca: 1, go: 2 } },
];

export interface PlanModule { id: string; key: string; width: number; unpainted?: boolean; alsoTramo?: number }
export interface PlanTramo { name: string; length: number; isIsland?: boolean; upper: PlanModule[]; lower: PlanModule[] }
export interface PlanExtras { latSup: number; latInf: number; latNevera: number; puertaAlta: number; especiales: number }
export interface ModulePlan {
  enabled: boolean;
  tramos: PlanTramo[];
  specialTramo?: Record<string, number>;
  alacenaEntrepanosWidth?: number;
  paintAll?: boolean;
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
    alacenaEntrepanosWidth: base.alacenaEntrepanosWidth,
    paintAll: base.paintAll !== false,
    extras: { ...emptyExtras(), ...(base.extras || {}) },
  };
}

export function specialWidth(plan: ModulePlan, key: string): number {
  const s = SPECIALS.find(x => x.key === key)!;
  return key === "alacenaEntrepanos" ? (plan.alacenaEntrepanosWidth ?? s.width) : s.width;
}

export function activeSpecials(plan: ModulePlan, config: any): Array<SpecialEntry & { tramo: number; w: number }> {
  const sm = config?.specialModules || {};
  return SPECIALS.filter(s => !!sm[s.key]).map(s => ({
    ...s,
    w: specialWidth(plan, s.key),
    tramo: Math.min(plan.specialTramo?.[s.key] ?? 0, Math.max(0, plan.tramos.length - 1)),
  }));
}

// Secuencia de una fila en un tramo, en orden: primero los vértices que vienen del tramo anterior, luego los propios.
export interface SeqItem { mod: PlanModule; width: number; fromPrev: boolean; start: number }
export function rowSequence(plan: ModulePlan, t: number, row: PlanRow): SeqItem[] {
  const out: SeqItem[] = [];
  let pos = 0;
  plan.tramos.forEach((tr, i) => {
    if (i === t) return;
    (tr[row] || []).forEach(m => {
      if (m.alsoTramo === t) { out.push({ mod: m, width: m.width, fromPrev: true, start: pos }); pos += m.width; }
    });
  });
  (plan.tramos[t]?.[row] || []).forEach(m => { out.push({ mod: m, width: m.width, fromPrev: false, start: pos }); pos += m.width; });
  return out;
}

export function rowUsed(plan: ModulePlan, t: number, row: PlanRow, config: any): number {
  let used = rowSequence(plan, t, row).reduce((a, s) => a + s.width, 0);
  // Los módulos de piso a techo ocupan las dos filas del tramo donde se coloquen
  activeSpecials(plan, config).forEach(s => { if (s.tramo === t) used += s.w; });
  return round2(used);
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
  const acc: Required<Pieces> = { up: 0, lo: 0, al: 0, ca: 0, es: 0, go: 0 };
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
        const painted = plan.paintAll !== false && !m.unpainted;
        if (painted && !cat.noPieces) addPieces(acc, cat.pieces(m.width));
      });
      const used = rowUsed(plan, t, row, config);
      const label = `${tr.name} · ${row === "upper" ? "superiores" : "inferiores"}`;
      if (tr.isIsland && row === "upper") return;
      if (tr.length > 0 && used > tr.length + 0.005) warnings.push(`${label}: te pasas ${(used - tr.length).toFixed(2)} m del largo de la pared.`);
    });

    // Avisos: esquinero inferior por debajo del mínimo funcional
    (tr.lower || []).forEach(m => {
      const cat = CATALOG_BY_KEY[m.key];
      if (cat?.min && m.width < cat.min - 1e-9) warnings.push(`${tr.name}: el ${cat.label.toLowerCase()} no debería bajar de ${cat.min.toFixed(2)} m.`);
    });

    // Avisos: platero sobre lavaplatos y extractor sobre estufa deben coincidir
    if (!tr.isIsland) {
      const up = rowSequence(plan, t, "upper"), lo = rowSequence(plan, t, "lower");
      const pos = (seq: SeqItem[], keys: string[]) => seq.find(s => keys.includes(s.mod.key))?.start;
      const pairs: Array<[string[], string[], string]> = [
        [["moduloPlatero"], ["moduloLavaplatos"], "El platero y el lavaplatos"],
        [["moduloExtractor", "moduloExtractorMicroondas"], ["moduloEstufaPuerta", "moduloEstufaHorno"], "El extractor y la estufa"],
      ];
      pairs.forEach(([a, b, msg]) => {
        const pa = pos(up, a), pb = pos(lo, b);
        if (pa !== undefined && pb !== undefined && Math.abs(pa - pb) > 0.02) warnings.push(`${tr.name}: ${msg} no quedan alineados (diferencia ${Math.abs(pa - pb).toFixed(2)} m).`);
      });
    }
  });

  // Especiales de piso a techo
  activeSpecials(plan, config).forEach(s => {
    addPieces(acc, s.pieces);
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
