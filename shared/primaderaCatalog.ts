/**
 * Catálogo Primadera 2025 (tableros MDP melamínicos) — proveedor habitual de Innovar.
 * Fuente: "CATALOGO 2025.pdf" enviado por Álvaro (7 nov 2026).
 * Las muestras (`/materiales/primadera/<code>.jpg`) son representaciones aproximadas del color;
 * para especificar, Primadera recomienda pedir muestra física.
 */
export type PrimaderaCategory = "nativas" | "unicolores" | "tendencia" | "piedras_textil" | "basicos";

export interface PrimaderaDesign {
  code: string;      // nombre del archivo de la muestra
  name: string;      // nombre comercial (el que se guarda en el proyecto)
  category: PrimaderaCategory;
  hint: string;      // descripción corta del catálogo
}

export const PRIMADERA_CATEGORY_LABELS: Record<PrimaderaCategory, string> = {
  nativas: "Maderas nativas colombianas",
  unicolores: "Unicolores",
  tendencia: "Maderas tendencia",
  piedras_textil: "Piedras + textil",
  basicos: "Básicos",
};

export const PRIMADERA_DESIGNS: PrimaderaDesign[] = [
  // Maderas nativas colombianas
  { code: "andino", name: "Andino", category: "nativas", hint: "Nogal cafetero, tonos chocolate" },
  { code: "flormorado", name: "Flormorado", category: "nativas", hint: "Dorados, arenas y marrones claros" },
  { code: "ika", name: "Ika", category: "nativas", hint: "Cinamomo, claro grisáceo" },
  { code: "kanua", name: "Kanua", category: "nativas", hint: "Diomate, cognac y caramelo" },
  { code: "sapan", name: "Sapán", category: "nativas", hint: "Cafés intensos rojizos" },
  { code: "tauari", name: "Tauarí", category: "nativas", hint: "Dorado pálido a miel, mate" },
  // Unicolores
  { code: "blanco_tradicional", name: "Blanco Tradicional", category: "unicolores", hint: "Blanco mate" },
  { code: "artico", name: "Ártico", category: "unicolores", hint: "Blanco puro mate" },
  { code: "bacata", name: "Bacatá", category: "unicolores", hint: "Azul grisáceo" },
  { code: "bareque", name: "Bareque", category: "unicolores", hint: "Arcilla, microtextura" },
  { code: "chircal", name: "Chircal", category: "unicolores", hint: "Ladrillo rojizo" },
  { code: "candelaria", name: "Candelaria", category: "unicolores", hint: "Blanco hueso" },
  { code: "creta", name: "Creta", category: "unicolores", hint: "Taupé, arena claro" },
  { code: "humo", name: "Humo", category: "unicolores", hint: "Gris frío" },
  { code: "jayka", name: "Jayka", category: "unicolores", hint: "Verde grisáceo" },
  { code: "maku", name: "Maku", category: "unicolores", hint: "Índigo profundo" },
  { code: "sukta", name: "Sukta", category: "unicolores", hint: "Grafito cálido" },
  { code: "yalaa", name: "Yalaa", category: "unicolores", hint: "Blanco cálido (off white)" },
  { code: "volcanico", name: "Volcánico", category: "unicolores", hint: "Grafito texturizado" },
  // Maderas tendencia
  { code: "brooklyn_oak", name: "Brooklyn Oak", category: "tendencia", hint: "Roble rústico, castaño y caramelo" },
  { code: "cocuy", name: "Cocuy", category: "tendencia", hint: "Olmo, blancos glaciales" },
  { code: "iguaque", name: "Iguaque", category: "tendencia", hint: "Espina de pescado, neutra" },
  { code: "majuy", name: "Majuy", category: "tendencia", hint: "Castaño grisáceo con nudos" },
  { code: "roble_cenizo", name: "Roble Cenizo", category: "tendencia", hint: "Roble, cenizos y lattes" },
  { code: "rovere_arena", name: "Rovere Arena", category: "tendencia", hint: "Roble entablillado, arena" },
  { code: "rustic_sand", name: "Rustic Sand", category: "tendencia", hint: "Roble con marcas de sierra" },
  { code: "sikuani", name: "Sikuani", category: "tendencia", hint: "Nogal americano" },
  { code: "tambo", name: "Tambo", category: "tendencia", hint: "Acacia grisácea" },
  { code: "taroa", name: "Taroa", category: "tendencia", hint: "Roble americano, miel" },
  { code: "tumaco", name: "Tumaco", category: "tendencia", hint: "Nogal, castaño profundo" },
  // Piedras + textil
  { code: "checua", name: "Checua", category: "piedras_textil", hint: "Mármol pulpis marrón" },
  { code: "suesca", name: "Suesca", category: "piedras_textil", hint: "Piedra caliza marfil" },
  { code: "tausa", name: "Tausa", category: "piedras_textil", hint: "Caliza gris, veta metalizada" },
  { code: "tihua", name: "Tihua", category: "piedras_textil", hint: "Microcemento gris claro" },
  { code: "london", name: "London", category: "piedras_textil", hint: "Textil lino oscuro" },
  // Básicos
  { code: "glaze", name: "Glazé", category: "basicos", hint: "Madera clara blanqueada" },
  { code: "mali", name: "Mali", category: "basicos", hint: "Madera con vetas marcadas" },
];

export const primaderaSwatchUrl = (code: string) => `/materiales/primadera/${code}.jpg`;

/** Busca un diseño por el nombre guardado en el proyecto (sin tildes ni mayúsculas). */
export function findPrimaderaDesign(name?: string | null): PrimaderaDesign | undefined {
  if (!name) return undefined;
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  const n = norm(name);
  return PRIMADERA_DESIGNS.find((d) => norm(d.name) === n);
}

// ─── Colores de la madera de un proyecto ─────────────────────────────────────
// Las cocinas por dentro casi siempre son blancas (a veces otro claro, p. ej. Yalaa).
// Por fuera: toda de un color, o superiores de un color e inferiores de otro.
// Se guarda como texto legible en el campo existente `woodColor` (sin cambios en la BD):
//   "Interior: Blanco Tradicional · Exterior: Sikuani"
//   "Interior: Blanco Tradicional · Superiores: Ártico · Inferiores: Sikuani"

export const DEFAULT_INTERIOR = "Blanco Tradicional";

export interface WoodColors {
  interior: string;
  mode: "toda" | "dividida";
  exterior: string;     // cuando mode = "toda"
  superiores: string;   // cuando mode = "dividida"
  inferiores: string;
}

export const emptyWoodColors = (): WoodColors => ({
  interior: DEFAULT_INTERIOR, mode: "toda", exterior: "", superiores: "", inferiores: "",
});

const LABELS = { interior: "Interior", exterior: "Exterior", superiores: "Superiores", inferiores: "Inferiores" } as const;

export function parseWoodColors(text?: string | null): WoodColors {
  const t = (text || "").trim();
  if (!t) return emptyWoodColors();
  const labeled = /^(Interior|Exterior|Superiores|Inferiores)\s*:/im.test(t);
  if (!labeled) {
    // Texto viejo o libre: se toma como el color exterior; el interior queda sin definir
    return { interior: "", mode: "toda", exterior: t, superiores: "", inferiores: "" };
  }
  const out: WoodColors = { interior: "", mode: "toda", exterior: "", superiores: "", inferiores: "" };
  for (const part of t.split("·")) {
    const m = part.match(/^\s*(Interior|Exterior|Superiores|Inferiores)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase() as keyof typeof LABELS;
    out[key] = m[2].trim();
  }
  if (out.superiores || out.inferiores) out.mode = "dividida";
  return out;
}

export function formatWoodColors(c: WoodColors): string {
  const parts: string[] = [];
  if (c.interior.trim()) parts.push(`${LABELS.interior}: ${c.interior.trim()}`);
  if (c.mode === "toda") {
    if (c.exterior.trim()) parts.push(`${LABELS.exterior}: ${c.exterior.trim()}`);
  } else {
    if (c.superiores.trim()) parts.push(`${LABELS.superiores}: ${c.superiores.trim()}`);
    if (c.inferiores.trim()) parts.push(`${LABELS.inferiores}: ${c.inferiores.trim()}`);
  }
  return parts.join(" · ");
}

/** Filas para mostrar (Interior / Exterior o Superiores / Inferiores), solo las que tienen color. */
export function woodColorRows(c: WoodColors): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [{ label: LABELS.interior, value: c.interior }];
  if (c.mode === "toda") rows.push({ label: LABELS.exterior, value: c.exterior });
  else rows.push({ label: LABELS.superiores, value: c.superiores }, { label: LABELS.inferiores, value: c.inferiores });
  return rows.filter((r) => r.value.trim());
}
