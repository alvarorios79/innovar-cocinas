// Esquema (dibujo de frente) del plano de módulos de la cocina — lógica pura, sin React ni librerías.
// Lo usan: el visor del proyecto (diseñador / jefe de taller) y la última página del PDF de la cotización.
import {
  normalizePlan, computePlan, rowItems, isPainted, CATALOG_BY_KEY, round2,
  type ModulePlan, type PlanRow,
} from "./kitchenModulePlan";
import { PRIMADERA_DESIGNS, woodShortName, woodSwatchUrl, woodHasPhoto } from "./primaderaCatalog";
import { findCountertopDesign, countertopLabel, countertopSwatchUrl, countertopHasPhoto } from "./countertopCatalog";

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
  /** Solo servidor (PDF): capturas del plano en 3D (distribución de la cocina), ya descargadas */
  imagenes3d?: any[];
  /** Colores y piedra sugeridos (orientativos) con su muestra: la hoja de distribución los nombra */
  colores?: ColorSugerido[];
}

export interface ColorSugerido { etiqueta: string; nombre: string; url?: string }

/** Colores y piedra que el plano de módulos sugiere (todos orientativos; el definitivo se elige al aprobar el diseño). */
export function coloresDelPlan(plan: any): ColorSugerido[] {
  const out: ColorSugerido[] = [];
  const madera = (etiqueta: string, nombre?: string) => {
    if (!nombre) return;
    const d = PRIMADERA_DESIGNS.find(x => x.name === nombre);
    out.push({ etiqueta, nombre: d ? woodShortName(d) : nombre, url: d && woodHasPhoto(d) ? woodSwatchUrl(d) : undefined });
  };
  const piedra = (etiqueta: string, nombre?: string) => {
    if (!nombre) return;
    const d = findCountertopDesign(nombre);
    out.push({ etiqueta, nombre: d ? countertopLabel(d) : nombre, url: d && countertopHasPhoto(d) ? countertopSwatchUrl(d.code) : undefined });
  };
  madera("Muebles (todo)", plan?.colorExt);
  madera("Muebles superiores", plan?.colorSup);
  madera("Muebles inferiores", plan?.colorInf);
  madera("Módulos de piso a techo", plan?.colorAlt);
  madera("Isla", plan?.colorIsla);
  madera("Interior", plan?.colorInt);
  piedra("Mesón", plan?.colorMeson);
  if (plan?.colorMesonIsla && plan.colorMesonIsla !== plan.colorMeson) piedra("Mesón de la isla", plan.colorMesonIsla);
  return out;
}

const LAYOUT_LABELS: Record<string, string> = { lineal: "Lineal", L: "En L", U: "En U", paralela: "Paralela", isla: "Con isla", cuadrada: "Cuadrada", otra: "Otra forma" };

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
