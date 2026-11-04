// Esquema (dibujo de frente) del plano de módulos de la cocina — lógica pura, sin React ni librerías.
// Lo usan: el visor del proyecto (diseñador / jefe de taller) y la última página del PDF de la cotización.
import {
  normalizePlan, computePlan, rowItems, isPainted, CATALOG_BY_KEY, round2,
  type ModulePlan, type PlanRow,
} from "./kitchenModulePlan";

export interface SchemeBlock {
  x: number;                 // m desde el inicio de la pared
  w: number;                 // ancho en m
  label: string;             // nombre corto
  lane: "upper" | "lower" | "tall";
  kind: "mod" | "window" | "tall";
  painted: boolean;          // va pintado (solo informativo para el taller)
  faded?: boolean;           // viene de la pared vecina (esquinero compartido)
  lockAt?: boolean;          // ubicación bloqueada (ventana)
}
export interface SchemeWall { name: string; length: number; extent: number; isIsland: boolean; blocks: SchemeBlock[] }
export interface SchemeData {
  title: string;
  layout: string;
  walls: SchemeWall[];
  modules: Array<{ label: string; qty: number; widths: number[] }>;
  pieces: Array<{ label: string; n: number }>;
  warnings: string[];
}

const LAYOUT_LABELS: Record<string, string> = { lineal: "Lineal", L: "En L", U: "En U", isla: "Con isla", cuadrada: "Cuadrada", otra: "Otra forma" };

export function buildScheme(rawPlan: any, config: any, title = "Cocina integral"): SchemeData | null {
  if (!rawPlan?.enabled) return null;
  const plan: ModulePlan = normalizePlan(rawPlan, config);
  const walls: SchemeWall[] = plan.tramos.map((tr, t) => {
    const blocks: SchemeBlock[] = [];
    (["upper", "lower"] as PlanRow[]).forEach(row => {
      if (tr.isIsland && row === "upper") return;
      rowItems(plan, t, row, config).forEach(it => {
        if (it.kind === "tall") {
          if (row === "lower") blocks.push({ x: round2(it.start), w: round2(it.width), label: it.special!.label, lane: "tall", kind: "tall", painted: plan.paintKeys?.[it.key] !== false });
          return;
        }
        const cat = CATALOG_BY_KEY[it.key];
        if (!cat) return;
        blocks.push({
          x: round2(it.start), w: round2(it.width), label: cat.short, lane: row,
          kind: it.key === "ventana" ? "window" : "mod",
          painted: !cat.noPieces && isPainted(plan, it.mod!, row),
          faded: it.fromPrev, lockAt: it.mod?.lockAt !== undefined,
        });
      });
    });
    const extent = Math.max(tr.length || 0, ...blocks.map(b => b.x + b.w), 1);
    return { name: tr.name, length: tr.length || 0, extent: round2(extent), isIsland: !!tr.isIsland, blocks };
  });
  if (!walls.some(w => w.blocks.length)) return null;
  const res = computePlan(plan, config);
  const PN: Array<[keyof typeof res.pieces, string]> = [
    ["up", "Puertas superiores"], ["lo", "Puertas inferiores"], ["al", "Puertas de módulos altos"], ["ca", "Tapas de cajón"],
    ["es", "Tapas de especiero"], ["go", "Golas"], ["lat", "Laterales grandes"], ["special", "Piezas especiales"],
  ];
  return {
    title,
    layout: LAYOUT_LABELS[config?.layout] || String(config?.layout || ""),
    walls,
    modules: res.modules.map(m => ({ label: m.label, qty: m.qty, widths: m.widths })),
    pieces: PN.map(([k, label]) => ({ label, n: Number(res.pieces[k]) || 0 })).filter(p => p.n > 0),
    warnings: res.warnings,
  };
}
