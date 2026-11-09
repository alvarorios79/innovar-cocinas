/**
 * Portafolio: el registro de los trabajos para mostrar a clientes y publicar en redes.
 *
 * Cada proyecto se muestra en 4 bloques:
 *  - Antes:        el sitio como estaba (fotos del levantamiento del medidor + "Fotos iniciales")
 *  - Diseño:       modelado 3D y renders
 *  - Instalación:  la instalación en la obra (las fotos del taller —corte, enchape, armado— NO van)
 *  - Después:      fotos finales + videos del recorrido
 *
 * Entran los proyectos entregados o cerrados (también archivados) que tengan al menos una foto útil.
 */

export const PORTFOLIO_VIEW_ROLES = ["super_admin", "admin", "comercial", "disenador"];
/** Marcan estrellas, suben videos y registran publicaciones en redes. */
export const PORTFOLIO_EDIT_ROLES = ["super_admin", "admin", "comercial"];

export const canViewPortfolio = (role?: string | null) => !!role && PORTFOLIO_VIEW_ROLES.includes(role);
export const canEditPortfolio = (role?: string | null) => !!role && PORTFOLIO_EDIT_ROLES.includes(role);

export type PortfolioSection = "antes" | "diseno" | "instalacion" | "despues";

export const PORTFOLIO_SECTIONS: { key: PortfolioSection; label: string; hint: string }[] = [
  { key: "antes", label: "Antes", hint: "El espacio como estaba" },
  { key: "diseno", label: "Diseño", hint: "Modelado 3D y renders" },
  { key: "instalacion", label: "Instalación", hint: "En la obra" },
  { key: "despues", label: "Después", hint: "Trabajo terminado" },
];

/** Carpeta de la foto del proyecto (subcategoría) → bloque del portafolio. */
const SUBCATEGORY_SECTION: Record<string, PortfolioSection> = {
  fotos_iniciales: "antes",
  modelado_3d: "diseno",
  renders: "diseno",
  proceso_instalacion: "instalacion",
  fotos_finales: "despues",
};

export function portfolioSectionOf(subcategory?: string | null): PortfolioSection | null {
  return (subcategory && SUBCATEGORY_SECTION[subcategory]) || null;
}

export const PORTFOLIO_SUBCATEGORIES = Object.keys(SUBCATEGORY_SECTION);

/** Ruta del archivo sin parámetros (las URL de Firebase llevan la ruta codificada antes de "?"). */
function filePath(url: string): string {
  const clean = (url || "").split("?")[0];
  try {
    return decodeURIComponent(clean).toLowerCase();
  } catch {
    return clean.toLowerCase();
  }
}

/** Solo imágenes (las carpetas de diseño a veces tienen PDF). */
export function isImageUrl(url: string): boolean {
  const p = filePath(url);
  if (p.startsWith("data:image/")) return true;
  if (/\.(pdf|docx?|xlsx?|zip|dwg|skp|mp4|mov|m4v|webm)$/.test(p)) return false;
  return true; // sin extensión conocida: se trata como imagen
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm|3gp)$/.test(filePath(url));
}

export const WORK_TYPE_LABELS: Record<string, string> = {
  cocina: "Cocina integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
  mueble_bano: "Mueble de baño",
  escaleras: "Escaleras",
  empresas: "Mobiliario para empresa",
  otro: "Otro",
};
export const workTypeLabel = (w?: string | null) => (w && WORK_TYPE_LABELS[w]) || (w ? w.replace(/_/g, " ") : "Trabajo");

/** Ciudades donde trabaja Innovar (para filtrar y para los hashtags). */
export const PORTFOLIO_CITIES = [
  "Pereira", "Dosquebradas", "La Virginia", "Cartago", "Armenia", "Santa Rosa de Cabal", "Cerritos",
];

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Ciudad del proyecto: la del levantamiento, o la que aparezca en la dirección. */
export function detectCity(visitCity?: string | null, address?: string | null): string | null {
  const vc = (visitCity || "").trim();
  if (vc) {
    const known = PORTFOLIO_CITIES.find((c) => strip(c) === strip(vc));
    return known || vc.replace(/\b\w/g, (m) => m.toUpperCase());
  }
  const a = strip(address || "");
  if (!a) return null;
  // primero las de varias palabras para que "Santa Rosa de Cabal" no quede como otra
  const sorted = [...PORTFOLIO_CITIES].sort((x, y) => y.length - x.length);
  return sorted.find((c) => a.includes(strip(c))) || null;
}

/** Tamaño legible de un archivo. */
export function formatBytes(n?: number | null): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Límite de tamaño de un video (un recorrido de 1–2 min grabado en el celular pesa 100–400 MB). */
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB
