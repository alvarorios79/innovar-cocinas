/**
 * Redes: plan semanal, tipos de publicación y textos sugeridos.
 *
 * Idea: publicar seguido sin depender de la inspiración. Cada proyecto del portafolio deja
 * publicaciones casi listas (imagen + texto) y el CRM recuerda el día que toca publicar.
 */
import { parseWoodColors } from "./primaderaCatalog";
import { workTypeLabel } from "./portfolio";

export type SocialPostType = "antes_despues" | "render_vs_real" | "video" | "terminado";
export type SocialNetwork = "instagram" | "facebook" | "tiktok";

export const SOCIAL_POST_TYPES: Record<SocialPostType, { label: string; emoji: string; needs: string; description: string }> = {
  antes_despues: {
    label: "Antes y después", emoji: "✨", needs: "Foto del antes y foto final",
    description: "El espacio vacío al lado del trabajo terminado. Es lo que más se comparte.",
  },
  render_vs_real: {
    label: "Render vs. realidad", emoji: "🖥️", needs: "Render y foto final",
    description: "Lo que diseñamos al lado de lo que entregamos: genera confianza.",
  },
  video: {
    label: "Video recorrido", emoji: "🎥", needs: "Video del recorrido",
    description: "Reel / TikTok del recorrido por la obra terminada.",
  },
  terminado: {
    label: "Trabajo terminado", emoji: "🏡", needs: "Foto final",
    description: "Las mejores fotos finales (sirve cuando no hay antes ni render).",
  },
};
export const SOCIAL_POST_TYPE_KEYS = Object.keys(SOCIAL_POST_TYPES) as SocialPostType[];

export const SOCIAL_NETWORKS: Record<SocialNetwork, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  facebook: { label: "Facebook", color: "#1877F2" },
  tiktok: { label: "TikTok", color: "#25F4EE" },
};
export const SOCIAL_NETWORK_KEYS = Object.keys(SOCIAL_NETWORKS) as SocialNetwork[];

/** Plan fijo: 3 publicaciones por semana (día de la semana: 1 = lunes … 5 = viernes). */
export const WEEKLY_PLAN: { weekday: number; day: string; type: SocialPostType }[] = [
  { weekday: 1, day: "Lunes", type: "antes_despues" },
  { weekday: 3, day: "Miércoles", type: "render_vs_real" },
  { weekday: 5, day: "Viernes", type: "video" },
];
/** Si para el tipo del día no hay material, se propone este. */
export const FALLBACK_POST_TYPE: SocialPostType = "terminado";

/** Quién recibe el recordatorio de publicar (por ahora solo el CEO; luego admin/comercial). */
export const SOCIAL_REMINDER_ROLES = ["super_admin"];

/** Qué tipos de publicación se pueden armar con lo que tiene el proyecto. */
export function availablePostTypes(c: { antes: number; diseno: number; despues: number; videos: number }): SocialPostType[] {
  const out: SocialPostType[] = [];
  if (c.antes > 0 && c.despues > 0) out.push("antes_despues");
  if (c.diseno > 0 && c.despues > 0) out.push("render_vs_real");
  if (c.videos > 0) out.push("video");
  if (c.despues > 0) out.push("terminado");
  return out;
}

// ── Fechas (hora Colombia) ──────────────────────────────────────────────────

/** "YYYY-MM-DD" de hoy en Colombia. */
export function bogotaYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now);
}
/** Día de la semana en Colombia (0 = domingo … 6 = sábado). */
export function bogotaWeekday(now = new Date()): number {
  const [y, m, d] = bogotaYmd(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
/** Lunes de la semana (Colombia) como "YYYY-MM-DD". */
export function weekStartYmd(now = new Date()): string {
  const [y, m, d] = bogotaYmd(now).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const wd = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (wd === 0 ? 6 : wd - 1));
  return date.toISOString().slice(0, 10);
}
/** Primer día del mes (Colombia) como "YYYY-MM-DD". */
export function monthStartYmd(now = new Date()): string {
  return `${bogotaYmd(now).slice(0, 8)}01`;
}

// ── Textos sugeridos ────────────────────────────────────────────────────────

export type CaptionInput = {
  type: SocialPostType;
  workType?: string | null;
  city?: string | null;
  woodColor?: string | null;   // texto de Materiales ("Interior: … · Exterior: …")
  countertop?: string | null;  // nombre del mesón
  weeks?: number | null;       // semanas desde la aprobación del diseño hasta la entrega
};

const FEMININE = new Set(["cocina", "puertas", "escaleras"]);
const PLURAL = new Set(["puertas", "escaleras"]);

/** "esta cocina integral" / "este closet" / "estas puertas". */
function thisWork(workType?: string | null): string {
  const w = workType || "";
  const label = workTypeLabel(w).toLowerCase();
  if (PLURAL.has(w)) return `estas ${label}`;
  return `${FEMININE.has(w) ? "esta" : "este"} ${label}`;
}
/** "entregada" / "entregado" / "entregadas". */
function done(workType: string | null | undefined, word: string): string {
  const w = workType || "";
  const base = word.slice(0, -1); // "entregado" → "entregad"
  return `${base}${FEMININE.has(w) ? "a" : "o"}${PLURAL.has(w) ? "s" : ""}`;
}

/** Nombre sin la marca entre paréntesis: "Humo (Duratex)" → "Humo". */
const cleanName = (s: string) => s.replace(/\s*\((Duratex|Primadera|Altos brillos)\)\s*$/i, "").trim();

/** Colores de madera a la vista (el interior blanco no se menciona). */
export function woodForCaption(text?: string | null): string {
  const c = parseWoodColors(text);
  if (c.mode === "toda") return cleanName(c.exterior);
  const parts = [c.superiores && `superiores ${cleanName(c.superiores)}`, c.inferiores && `inferiores ${cleanName(c.inferiores)}`].filter(Boolean);
  return parts.join(" y ");
}

const WORK_HASHTAGS: Record<string, string[]> = {
  cocina: ["#CocinasIntegrales", "#CocinasModernas", "#DiseñoDeCocinas"],
  closet: ["#Closets", "#ClosetsModernos", "#ClosetsAMedida"],
  mueble_bano: ["#MueblesDeBaño", "#BañosModernos"],
  centro_tv: ["#CentroDeEntretenimiento", "#MueblesTV"],
  puertas: ["#Puertas", "#PuertasModernas"],
  escaleras: ["#Escaleras", "#EscalerasModernas"],
  empresas: ["#MobiliarioDeOficina", "#Oficinas"],
};

const cityTag = (city: string) => `#${city.replace(/\s+/g, "")}`;

export function captionHashtags(input: CaptionInput, max = 10): string[] {
  const tags = [
    ...(WORK_HASHTAGS[input.workType || ""] || ["#MueblesAMedida"]),
    ...(input.city ? [cityTag(input.city)] : []),
    "#Pereira", "#EjeCafetero", "#HechoAMedida", "#DiseñoDeInteriores", "#InnovarCocinas",
  ];
  return Array.from(new Set(tags)).slice(0, max);
}

const WHATSAPP = "313 680 2025";
const WHATSAPP_LINK = "https://wa.link/y3mpkk";
const WEB = "https://cocinasintegralespereira.co/";

/** Primera línea según el tipo de publicación. */
function opening(input: CaptionInput): string {
  const where = input.city ? ` en ${input.city}` : "";
  const work = thisWork(input.workType);
  switch (input.type) {
    case "antes_despues":
      return `✨ Antes y después de ${work}${where}.`;
    case "render_vs_real": {
      const w = input.workType || "";
      const pron = `${FEMININE.has(w) ? "la" : "lo"}${PLURAL.has(w) ? "s" : ""}`;
      const quedo = PLURAL.has(w) ? "quedaron" : "quedó";
      return `🖥️➡️🏠 Así ${pron} diseñamos, así ${quedo}: ${work}${where}. Primero el render 3D para aprobar cada detalle; después, la realidad.`;
    }
    case "video":
      return `🎥 Recorrido por ${work}${where}, recién ${done(input.workType, "entregado")}.`;
    default:
      return `🏡 ${work.charAt(0).toUpperCase()}${work.slice(1)}${where}, ${done(input.workType, "terminado")} y ${done(input.workType, "entregado")}.`;
  }
}

function detailLines(input: CaptionInput): string[] {
  const lines: string[] = [];
  const wood = woodForCaption(input.woodColor);
  if (wood) lines.push(`🪵 Madera: ${wood}`);
  if (input.countertop?.trim()) lines.push(`🪨 Mesón: ${input.countertop.trim()}`);
  if (input.weeks && input.weeks >= 1 && input.weeks <= 12) {
    lines.push(`⏱️ ${input.weeks === 1 ? "1 semana" : `${input.weeks} semanas`} desde la aprobación del diseño`);
  }
  return lines;
}

/** Texto sugerido para cada red (se puede editar antes de copiar). */
export function buildCaption(input: CaptionInput, network: SocialNetwork): string {
  const first = opening(input);
  const details = detailLines(input);

  if (network === "tiktok") {
    return [first, "Diseño, fabricación e instalación a la medida. 📲 " + WHATSAPP, captionHashtags(input, 6).join(" ")]
      .join("\n\n");
  }

  const body = [
    first,
    details.length ? details.join("\n") : "",
    "Diseñamos, fabricamos e instalamos directo de fábrica, sin intermediarios, con garantía en todos nuestros proyectos.",
  ].filter(Boolean);

  if (network === "facebook") {
    return [
      ...body,
      `📲 Cotiza por WhatsApp: ${WHATSAPP} → ${WHATSAPP_LINK}`,
      `🌐 ${WEB}`,
      captionHashtags(input, 4).join(" "),
    ].join("\n\n");
  }

  // Instagram
  return [
    ...body,
    `📲 Cotiza por WhatsApp: ${WHATSAPP} (enlace en la biografía)`,
    captionHashtags(input, 12).join(" "),
  ].join("\n\n");
}

/** Semanas entre dos fechas (redondeado; null si no hay datos). */
export function weeksBetween(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  const a = new Date(from.includes("T") ? from : from.replace(" ", "T")).getTime();
  const b = new Date(to.includes("T") ? to : to.replace(" ", "T")).getTime();
  if (!isFinite(a) || !isFinite(b) || b <= a) return null;
  return Math.max(1, Math.round((b - a) / (7 * 24 * 60 * 60 * 1000)));
}
