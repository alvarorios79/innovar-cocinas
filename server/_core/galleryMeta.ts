/**
 * Vista previa al compartir el enlace del portal del cliente (/gallery?project=X&token=Y).
 *
 * WhatsApp/Facebook no ejecutan la app (SPA): leen las etiquetas Open Graph del HTML.
 * Para esos enlaces el servidor inserta título, descripción y foto del proyecto.
 * Privacidad: NUNCA el nombre ni la dirección del cliente (el enlace se comparte con familia y amigos).
 */
import * as db from "../db";

const WORK_TYPES: Record<string, string> = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
  mueble_bano: "Mueble de Baño",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function buildGalleryMetaTags(query: Record<string, any>, origin: string): Promise<string | null> {
  const projectId = parseInt(String(query.project || ""), 10);
  const token = String(query.token || "");
  if (!projectId || !token) return null;

  const project: any = await db.getProjectByIdPublic(projectId);
  if (!project || !project.publicToken || project.publicToken !== token) return null;

  const photos: any[] = await db.getProjectPhotosByProjectId(projectId);
  const byNewest = (list: any[]) => list.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const finals = byNewest(photos.filter(p => p.stage === "final" || p.category === "entrega"));
  const renders = byNewest(photos.filter(p => p.subcategory === "renders"));
  const modelado = byNewest(photos.filter(p => p.subcategory === "modelado_3d"));
  const isImage = (u?: string) => !!u && !/\.pdf($|\?)/i.test(u);
  const pick = [...finals, ...renders, ...modelado].find(p => isImage(p.photoUrl));
  let image = pick?.photoUrl || "/logo-light.png";
  if (image.startsWith("/")) image = origin + image;

  const work = WORK_TYPES[project.workType] || "Proyecto";
  const delivered = project.status === "entregado";
  const type = String(query.type || "");
  const title = delivered
    ? `¡Así quedó esta ${work.toLowerCase()}! — Innovar Cocinas de Diseño`
    : type === "renders"
      ? `Renders de tu ${work.toLowerCase()} — Innovar Cocinas de Diseño`
      : type === "modelado_3d"
        ? `Modelado 3D de tu ${work.toLowerCase()} — Innovar Cocinas de Diseño`
        : `${work} — Innovar Cocinas de Diseño`;
  const description = delivered
    ? "Diseño, fabricación e instalación a medida en Pereira. Mira el recorrido completo del proyecto."
    : "Diseño a medida con renders previos. Fábrica directa en Pereira.";
  const url = `${origin}/gallery?project=${projectId}&token=${encodeURIComponent(token)}${type ? `&type=${encodeURIComponent(type)}` : ""}`;

  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");
}

/** Inserta las etiquetas en el <head> del index.html y cambia el <title>. */
export function injectMetaTags(html: string, tags: string, title?: string): string {
  let out = html.replace("</head>", `    ${tags}\n  </head>`);
  if (title) out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  return out;
}
