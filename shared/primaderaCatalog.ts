/**
 * Catálogo Primadera 2025 (tableros MDP melamínicos) — proveedor habitual de Innovar.
 * Fuente: "CATALOGO 2025.pdf" enviado por Álvaro (7 nov 2026).
 * Las muestras (`/materiales/primadera/<code>.jpg`) son representaciones aproximadas del color;
 * para especificar, Primadera recomienda pedir muestra física.
 */
import { TEXTURES_PRIMADERA, TEXTURES_DURATEX } from "./textures";

export type PrimaderaCategory =
  | "nativas" | "unicolores" | "tendencia" | "piedras_textil" | "basicos"   // Primadera
  | "altos_brillos"                                                        // Altos brillos
  | "dx_maderas" | "dx_unicolores" | "dx_hibridos";                        // Duratex

/** Marcas / líneas del catálogo de madera (en la ventana se elige primero la marca). */
export type WoodBrand = "Primadera" | "Duratex" | "Altos brillos";
export const WOOD_BRANDS: WoodBrand[] = ["Primadera", "Duratex", "Altos brillos"];
export const BRAND_OF_CATEGORY: Record<PrimaderaCategory, WoodBrand> = {
  nativas: "Primadera", unicolores: "Primadera", tendencia: "Primadera", piedras_textil: "Primadera", basicos: "Primadera",
  altos_brillos: "Altos brillos",
  dx_maderas: "Duratex", dx_unicolores: "Duratex", dx_hibridos: "Duratex",
};
const BRAND_DIR: Record<WoodBrand, string> = { Primadera: "primadera", Duratex: "duratex", "Altos brillos": "primadera" };

export interface PrimaderaDesign {
  code: string;      // nombre del archivo de la muestra
  name: string;      // texto que se guarda en el proyecto (Duratex lleva "(Duratex)" para no confundir con Primadera)
  short?: string;    // nombre corto para mostrar en la ventana (si es distinto de `name`)
  category: PrimaderaCategory;
  hint: string;      // descripción corta del catálogo
  photo?: boolean;   // false = aún sin foto: se muestra un cuadro del color aproximado
  color?: string;    // color aproximado para el cuadro (solo cuando no hay foto)
}

export const PRIMADERA_CATEGORY_LABELS: Record<PrimaderaCategory, string> = {
  nativas: "Maderas nativas colombianas",
  unicolores: "Unicolores",
  tendencia: "Maderas tendencia",
  piedras_textil: "Piedras + textil",
  basicos: "Básicos",
  altos_brillos: "Altos brillos",
  dx_maderas: "Maderas",
  dx_unicolores: "Unicolores",
  dx_hibridos: "Piedras y textiles",
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
  // Altos brillos (pedido de Álvaro, 7 nov 2026). Fotos pendientes: al tenerlas, guardarlas como
  // client/public/materiales/primadera/<code>.jpg y quitar `photo: false`.
  { code: "alto_brillo_blanco", name: "Alto Brillo Blanco", category: "altos_brillos", hint: "Blanco brillante", photo: false, color: "#f4f4f2" },
  { code: "alto_brillo_gris_oscuro", name: "Alto Brillo Gris Oscuro", category: "altos_brillos", hint: "Gris oscuro brillante", photo: false, color: "#4a4e52" },
  { code: "alto_brillo_gris_claro", name: "Alto Brillo Gris Claro", category: "altos_brillos", hint: "Gris claro brillante", photo: false, color: "#c8cacc" },
  { code: "alto_brillo_capuchino", name: "Alto Brillo Capuchino", category: "altos_brillos", hint: "Café con leche brillante", photo: false, color: "#9c7a5c" },
  { code: "alto_brillo_beige", name: "Alto Brillo Beige", category: "altos_brillos", hint: "Beige brillante", photo: false, color: "#d9c7a6" },
  { code: "alto_brillo_hueso", name: "Alto Brillo Hueso", category: "altos_brillos", hint: "Blanco hueso brillante", photo: false, color: "#ebe2cf" },
  // Duratex — Colección 2024-2025 ("duratex_20242025.pdf", enviado por Álvaro el 7 nov 2026). 47 diseños.
  // Muestras recortadas del catálogo; Cedro y Wengue no traen muestra (color aproximado).
  { code: "arena", name: "Arena (Duratex)", short: "Arena", category: "dx_maderas", hint: "Atemporales" },
  { code: "capuccino", name: "Capuccino (Duratex)", short: "Capuccino", category: "dx_maderas", hint: "Atemporales" },
  { code: "cedro", name: "Cedro (Duratex)", short: "Cedro", category: "dx_maderas", hint: "Atemporales", photo: false, color: "#8b4a2b" },
  { code: "chantilli", name: "Chantillí (Duratex)", short: "Chantillí", category: "dx_maderas", hint: "Atemporales" },
  { code: "glacial", name: "Glacial (Duratex)", short: "Glacial", category: "dx_maderas", hint: "Atemporales" },
  { code: "gracia", name: "Grácia (Duratex)", short: "Grácia", category: "dx_maderas", hint: "Atemporales" },
  { code: "humo", name: "Humo (Duratex)", short: "Humo", category: "dx_maderas", hint: "Atemporales" },
  { code: "kallio", name: "Kallio (Duratex)", short: "Kallio", category: "dx_maderas", hint: "Atemporales" },
  { code: "mitte", name: "Mitte (Duratex)", short: "Mitte", category: "dx_maderas", hint: "Atemporales" },
  { code: "nuez", name: "Nuez (Duratex)", short: "Nuez", category: "dx_maderas", hint: "Atemporales" },
  { code: "soder", name: "Söder (Duratex)", short: "Söder", category: "dx_maderas", hint: "Atemporales" },
  { code: "tribeca", name: "Tribeca (Duratex)", short: "Tribeca", category: "dx_maderas", hint: "Atemporales" },
  { code: "vienes", name: "Vienés (Duratex)", short: "Vienés", category: "dx_maderas", hint: "Atemporales" },
  { code: "wengue", name: "Wengue (Duratex)", short: "Wengue", category: "dx_maderas", hint: "Atemporales", photo: false, color: "#3a2a20" },
  { code: "amaretto", name: "Amaretto (Duratex)", short: "Amaretto", category: "dx_maderas", hint: "Rústica" },
  { code: "austral", name: "Austral (Duratex)", short: "Austral", category: "dx_maderas", hint: "Rústica" },
  { code: "cala", name: "Cala (Duratex)", short: "Cala", category: "dx_maderas", hint: "Rústica" },
  { code: "carbono", name: "Carbono (Duratex)", short: "Carbono", category: "dx_maderas", hint: "Rústica" },
  { code: "koa", name: "Koa (Duratex)", short: "Koa", category: "dx_maderas", hint: "Rústica" },
  { code: "macula", name: "Mácula (Duratex)", short: "Mácula", category: "dx_maderas", hint: "Rústica" },
  { code: "tabacco_chic", name: "Tabacco Chic (Duratex)", short: "Tabacco Chic", category: "dx_maderas", hint: "Rústica" },
  { code: "bahia", name: "Bahía (Duratex)", short: "Bahía", category: "dx_maderas", hint: "Tendencia" },
  { code: "boreal", name: "Boreal (Duratex)", short: "Boreal", category: "dx_maderas", hint: "Tendencia" },
  { code: "bosco", name: "Bosco (Duratex)", short: "Bosco", category: "dx_maderas", hint: "Tendencia" },
  { code: "oasis", name: "Oasis (Duratex)", short: "Oasis", category: "dx_maderas", hint: "Tendencia" },
  { code: "riviera", name: "Riviera (Duratex)", short: "Riviera", category: "dx_maderas", hint: "Tendencia" },
  { code: "sagano", name: "Sagano (Duratex)", short: "Sagano", category: "dx_maderas", hint: "Tendencia" },
  { code: "terranta", name: "Terranta (Duratex)", short: "Terranta", category: "dx_maderas", hint: "Tendencia" },
  { code: "traviata", name: "Traviata (Duratex)", short: "Traviata", category: "dx_maderas", hint: "Tendencia" },
  { code: "ambar", name: "Ámbar (Duratex)", short: "Ámbar", category: "dx_unicolores", hint: "Sólido" },
  { code: "blanco_nevado", name: "Blanco Nevado (Duratex)", short: "Blanco Nevado", category: "dx_unicolores", hint: "Sólido" },
  { code: "cinza_cobalto", name: "Cinza Cobalto (Duratex)", short: "Cinza Cobalto", category: "dx_unicolores", hint: "Sólido" },
  { code: "graffo", name: "Graffo (Duratex)", short: "Graffo", category: "dx_unicolores", hint: "Sólido" },
  { code: "negro", name: "Negro (Duratex)", short: "Negro", category: "dx_unicolores", hint: "Sólido" },
  { code: "perla", name: "Perla (Duratex)", short: "Perla", category: "dx_unicolores", hint: "Sólido" },
  { code: "ultramar", name: "Ultramar (Duratex)", short: "Ultramar", category: "dx_unicolores", hint: "Sólido" },
  { code: "verde_olivo", name: "Verde Olivo (Duratex)", short: "Verde Olivo", category: "dx_unicolores", hint: "Sólido" },
  { code: "viena", name: "Viena (Duratex)", short: "Viena", category: "dx_unicolores", hint: "Sólido" },
  { code: "auro", name: "Auro (Duratex)", short: "Auro", category: "dx_unicolores", hint: "Metalizado" },
  { code: "bohemm", name: "Bohemm (Duratex)", short: "Bohemm", category: "dx_unicolores", hint: "Metalizado" },
  { code: "agatha", name: "Ágatha (Duratex)", short: "Ágatha", category: "dx_hibridos", hint: "Piedra" },
  { code: "etna", name: "Étna (Duratex)", short: "Étna", category: "dx_hibridos", hint: "Piedra" },
  { code: "lunar", name: "Lunar (Duratex)", short: "Lunar", category: "dx_hibridos", hint: "Piedra" },
  { code: "marmoro", name: "Mármoro (Duratex)", short: "Mármoro", category: "dx_hibridos", hint: "Piedra" },
  { code: "meril", name: "Meril (Duratex)", short: "Meril", category: "dx_hibridos", hint: "Piedra" },
  { code: "lana", name: "Lana (Duratex)", short: "Lana", category: "dx_hibridos", hint: "Textil" },
  { code: "sarga", name: "Sarga (Duratex)", short: "Sarga", category: "dx_hibridos", hint: "Textil" },
];

export const woodSwatchUrl = (d: PrimaderaDesign) => `/materiales/${BRAND_DIR[BRAND_OF_CATEGORY[d.category]]}/${d.code}.jpg`;
export const woodShortName = (d: PrimaderaDesign) => d.short ?? d.name;
/** Textura grande para descargar (o la muestra si aún no hay textura) y nombre del archivo. */
export function woodTexture(d: PrimaderaDesign): { url: string; fileName: string; full: boolean } {
  const brand = BRAND_OF_CATEGORY[d.category];
  const dir = BRAND_DIR[brand];
  const set = dir === "duratex" ? TEXTURES_DURATEX : TEXTURES_PRIMADERA;
  const full = woodHasPhoto(d) && set.has(d.code);
  return {
    url: full ? `/materiales/${dir}/texturas/${d.code}.jpg` : woodSwatchUrl(d),
    fileName: `${woodShortName(d)} - ${brand}.jpg`,
    full,
  };
}
export const woodHasPhoto = (d: PrimaderaDesign) => d.photo !== false;

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
