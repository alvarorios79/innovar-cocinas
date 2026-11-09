/**
 * Datos del Portafolio: junta, por proyecto, las fotos útiles para mostrar
 * (Antes · Diseño · Instalación · Después), los videos, las estrellas, los materiales
 * y lo ya publicado en redes. Lo usan los routers `portfolio` y `social`.
 */
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  clients, portfolioHidden, portfolioHistoric, portfolioStars, projectMaterials, quotationItems, projectPhotos, projects, projectVideos, quotations,
  socialPublications, technicalVisitPhotos, technicalVisits,
} from "../drizzle/schema";
import {
  PORTFOLIO_SUBCATEGORIES, detectCity, isImageUrl, portfolioSectionOf, type PortfolioSection,
} from "@shared/portfolio";
import { availablePostTypes, weeksBetween, type SocialPostType } from "@shared/socialPosts";
import { detectWorks, parseHistoricKinds, type WorkKind } from "@shared/workTypes";

export type PortfolioMedia = {
  key: string;                      // "foto-12" | "lev-5"
  source: "foto" | "levantamiento";
  id: number;
  url: string;
  folder: string;                   // carpeta de origen (para mostrar)
  createdAt: string;
  starred: boolean;
};

export type PortfolioVideo = {
  id: number; url: string; fileName: string | null; sizeBytes: number | null; createdAt: string;
};

export type PortfolioPublication = { id: number; postType: string; network: string; publishedAt: string };

export type PortfolioProject = {
  id: number;
  name: string;
  clientName: string;
  workType: string;
  works: WorkKind[];                // trabajos reales según la cotización (ver shared/workTypes.ts)
  status: string;
  closed: boolean;
  delivered: boolean;               // entregado, cerrado o archivado
  historic: boolean;                // trabajo histórico (anterior al CRM, solo Portafolio)
  hidden: boolean;                  // galería quitada del portafolio (se puede restaurar)
  deliveredAt: string | null;
  date: string;                     // para ordenar: entrega o, si no hay, creación del proyecto
  city: string | null;
  woodColor: string | null;
  countertop: string | null;
  weeks: number | null;
  media: Record<PortfolioSection, PortfolioMedia[]>;
  videos: PortfolioVideo[];
  publications: PortfolioPublication[];
};

const FOLDER_LABEL: Record<string, string> = {
  fotos_iniciales: "Fotos iniciales",
  modelado_3d: "Modelado 3D",
  renders: "Render",
  proceso_instalacion: "Instalación",
  fotos_finales: "Foto final",
  levantamiento: "Levantamiento",
};

const byDate = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/**
 * Proyectos del portafolio.
 * - Por defecto: los que tienen al menos una foto útil o video y no se quitaron del portafolio (Redes, avisos).
 * - `includeEmpty`: también los que no tienen fotos (para alimentarlos desde el Portafolio).
 * - `includeHidden`: también las galerías quitadas (para poder restaurarlas).
 * - `projectIds` limita la consulta (detalle de un proyecto).
 */
export async function loadPortfolio(
  db: any,
  opts: { projectIds?: number[]; includeEmpty?: boolean; includeHidden?: boolean } = {},
): Promise<PortfolioProject[]> {
  // Los históricos se guardan como proyectos borrados (para que no salgan en el resto del CRM)
  const base: any[] = [or(isNull(projects.deletedAt), sql`${projects.id} in (select "projectId" from "portfolioHistoric")`)];
  if (opts.projectIds?.length) base.push(inArray(projects.id, opts.projectIds));

  const rows = await db
    .select({
      id: projects.id, name: projects.name, workType: projects.workType, status: projects.status,
      accountingClosureId: projects.accountingClosureId, isArchived: projects.isArchived,
      deliveredAt: projects.deliveredAt, quotationId: projects.quotationId,
      currentApprovedQuotationId: projects.currentApprovedQuotationId,
      rendersApprovedAt: projects.rendersApprovedAt, modeladoApprovedAt: projects.modeladoApprovedAt,
      clientApprovedAt: projects.clientApprovedAt, advanceReceivedAt: projects.advanceReceivedAt,
      updatedAt: projects.updatedAt, createdAt: projects.createdAt,
      clientName: clients.name, clientAddress: clients.address,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(...base));
  if (!rows.length) return [];
  const ids: number[] = rows.map((r: any) => r.id);

  // ── Fotos del proyecto (solo carpetas útiles para mostrar) ─────────────────
  const photos = await db
    .select({ id: projectPhotos.id, projectId: projectPhotos.projectId, url: projectPhotos.photoUrl, subcategory: projectPhotos.subcategory, createdAt: projectPhotos.createdAt })
    .from(projectPhotos)
    .where(and(inArray(projectPhotos.projectId, ids), inArray(projectPhotos.subcategory, PORTFOLIO_SUBCATEGORIES)));

  // ── Levantamiento del medidor (fotos del "antes" y ciudad) ─────────────────
  // El levantamiento se enlaza al proyecto por projectId o por la cotización (y sus versiones).
  const qIds = Array.from(new Set<number>(rows.flatMap((r: any) => [r.quotationId, r.currentApprovedQuotationId]).filter(Boolean)));
  const quotationToProject = new Map<number, number>();
  if (qIds.length) {
    const qs = await db.select({ id: quotations.id, baseQuotationId: quotations.baseQuotationId }).from(quotations).where(inArray(quotations.id, qIds));
    const baseOf = new Map<number, number>(qs.map((q: any) => [q.id, q.baseQuotationId || q.id]));
    const bases = Array.from(new Set<number>(Array.from(baseOf.values())));
    const family = bases.length
      ? await db.select({ id: quotations.id, baseQuotationId: quotations.baseQuotationId }).from(quotations)
          .where(or(inArray(quotations.id, bases), inArray(quotations.baseQuotationId, bases)))
      : [];
    const projectOfBase = new Map<number, number>();
    for (const r of rows as any[]) {
      for (const q of [r.quotationId, r.currentApprovedQuotationId]) {
        if (q && baseOf.has(q)) projectOfBase.set(baseOf.get(q)!, r.id);
      }
    }
    for (const f of family as any[]) {
      const p = projectOfBase.get(f.baseQuotationId || f.id);
      if (p) quotationToProject.set(f.id, p);
    }
    for (const r of rows as any[]) for (const q of [r.quotationId, r.currentApprovedQuotationId]) if (q) quotationToProject.set(q, r.id);
  }
  const allQ = Array.from(quotationToProject.keys());
  const visits = await db
    .select({ id: technicalVisits.id, projectId: technicalVisits.projectId, quotationId: technicalVisits.quotationId, visitCity: technicalVisits.visitCity, clientAddress: technicalVisits.clientAddress, createdAt: technicalVisits.createdAt })
    .from(technicalVisits)
    .where(and(
      isNull(technicalVisits.deletedAt),
      allQ.length ? or(inArray(technicalVisits.projectId, ids), inArray(technicalVisits.quotationId, allQ)) : inArray(technicalVisits.projectId, ids),
    ))
    .orderBy(desc(technicalVisits.createdAt));
  const visitOfProject = new Map<number, any>();
  for (const v of visits as any[]) {
    const p = (v.projectId && ids.includes(v.projectId) ? v.projectId : null) ?? (v.quotationId ? quotationToProject.get(v.quotationId) : null);
    if (p && !visitOfProject.has(p)) visitOfProject.set(p, v); // el más reciente
  }
  const visitIds = Array.from(visitOfProject.values()).map((v) => v.id);
  const visitPhotos = visitIds.length
    ? await db.select({ id: technicalVisitPhotos.id, visitId: technicalVisitPhotos.visitId, url: technicalVisitPhotos.url, createdAt: technicalVisitPhotos.createdAt })
        .from(technicalVisitPhotos).where(inArray(technicalVisitPhotos.visitId, visitIds))
    : [];
  const projectOfVisit = new Map<number, number>();
  visitOfProject.forEach((v, p) => projectOfVisit.set(v.id, p));

  // ── Materiales, estrellas, videos y publicaciones ──────────────────────────
  const materials = await db
    .select({ projectId: projectMaterials.projectId, woodColor: projectMaterials.woodColor, countertopName: projectMaterials.countertopName, updatedAt: projectMaterials.updatedAt })
    .from(projectMaterials).where(inArray(projectMaterials.projectId, ids)).orderBy(desc(projectMaterials.updatedAt));
  const materialOf = new Map<number, any>();
  for (const m of materials as any[]) if (!materialOf.has(m.projectId)) materialOf.set(m.projectId, m);

  const stars = await db.select({ source: portfolioStars.source, mediaId: portfolioStars.mediaId })
    .from(portfolioStars).where(inArray(portfolioStars.projectId, ids));
  const starred = new Set<string>(stars.map((s: any) => `${s.source === "levantamiento" ? "lev" : "foto"}-${s.mediaId}`));

  const videos = await db.select().from(projectVideos)
    .where(and(inArray(projectVideos.projectId, ids), isNull(projectVideos.deletedAt)))
    .orderBy(desc(projectVideos.createdAt));

  // Trabajos reales: ítems de la cotización aprobada (o la original)
  const quoteOf = new Map<number, number>();
  for (const r of rows as any[]) { const q = r.currentApprovedQuotationId || r.quotationId; if (q) quoteOf.set(r.id, q); }
  const quoteIds = Array.from(new Set(Array.from(quoteOf.values())));
  const items = quoteIds.length
    ? await db.select({ quotationId: quotationItems.quotationId, itemType: quotationItems.itemType, description: quotationItems.description, kitchenConfig: quotationItems.kitchenConfig })
        .from(quotationItems).where(inArray(quotationItems.quotationId, quoteIds))
    : [];
  const itemsOf = new Map<number, any[]>();
  for (const it of items as any[]) { if (!itemsOf.has(it.quotationId)) itemsOf.set(it.quotationId, []); itemsOf.get(it.quotationId)!.push(it); }

  const historicRows = await db.select({ projectId: portfolioHistoric.projectId, workKind: portfolioHistoric.workKind })
    .from(portfolioHistoric).where(inArray(portfolioHistoric.projectId, ids));
  const historicKind = new Map<number, WorkKind[]>(historicRows.map((h: any) => [h.projectId, parseHistoricKinds(h.workKind)]));

  const hiddenRows = await db.select({ projectId: portfolioHidden.projectId }).from(portfolioHidden).where(inArray(portfolioHidden.projectId, ids));
  const hiddenSet = new Set<number>(hiddenRows.map((h: any) => h.projectId));

  const pubs = await db.select({ id: socialPublications.id, projectId: socialPublications.projectId, postType: socialPublications.postType, network: socialPublications.network, publishedAt: socialPublications.publishedAt })
    .from(socialPublications).where(inArray(socialPublications.projectId, ids)).orderBy(desc(socialPublications.publishedAt));

  // ── Armar cada proyecto ────────────────────────────────────────────────────
  const empty = (): Record<PortfolioSection, PortfolioMedia[]> => ({ antes: [], diseno: [], instalacion: [], despues: [] });
  const mediaOf = new Map<number, Record<PortfolioSection, PortfolioMedia[]>>();
  const bucket = (p: number) => { if (!mediaOf.has(p)) mediaOf.set(p, empty()); return mediaOf.get(p)!; };

  for (const v of visitPhotos as any[]) {
    const p = projectOfVisit.get(v.visitId);
    if (!p || !v.url || !isImageUrl(v.url)) continue;
    const key = `lev-${v.id}`;
    bucket(p).antes.push({ key, source: "levantamiento", id: v.id, url: v.url, folder: FOLDER_LABEL.levantamiento, createdAt: v.createdAt, starred: starred.has(key) });
  }
  for (const ph of photos as any[]) {
    const section = portfolioSectionOf(ph.subcategory);
    if (!section || !ph.url || !isImageUrl(ph.url)) continue;
    const key = `foto-${ph.id}`;
    bucket(ph.projectId)[section].push({ key, source: "foto", id: ph.id, url: ph.url, folder: FOLDER_LABEL[ph.subcategory] || ph.subcategory, createdAt: ph.createdAt, starred: starred.has(key) });
  }

  const out: PortfolioProject[] = [];
  for (const r of rows as any[]) {
    const media = mediaOf.get(r.id) || empty();
    media.antes.sort(byDate);
    media.instalacion.sort(byDate);
    media.despues.sort(byDate);
    // Diseño: renders primero (los más nuevos arriba = última versión), luego modelado
    media.diseno.sort((a, b) => (a.folder === b.folder ? b.createdAt.localeCompare(a.createdAt) : a.folder === "Render" ? -1 : 1));
    const vids = (videos as any[]).filter((v) => v.projectId === r.id)
      .map((v) => ({ id: v.id, url: v.url, fileName: v.fileName, sizeBytes: v.sizeBytes ? Number(v.sizeBytes) : null, createdAt: v.createdAt }));
    const total = media.antes.length + media.diseno.length + media.instalacion.length + media.despues.length + vids.length;
    if (!total && !opts.includeEmpty) continue;
    const hidden = hiddenSet.has(r.id);
    if (hidden && !opts.includeHidden) continue;

    const visit = visitOfProject.get(r.id);
    const mat = materialOf.get(r.id);
    out.push({
      id: r.id,
      name: r.name,
      clientName: historicKind.has(r.id) ? "" : r.clientName || "",  // los históricos no tienen cliente
      workType: r.workType,
      works: historicKind.has(r.id) ? historicKind.get(r.id)! : detectWorks(itemsOf.get(quoteOf.get(r.id) || -1) || [], r.workType),
      status: r.status,
      closed: !!r.accountingClosureId,
      historic: historicKind.has(r.id),
      delivered: historicKind.has(r.id) || r.status === "entregado" || !!r.accountingClosureId || r.isArchived === 1 || !!r.deliveredAt,
      hidden,
      deliveredAt: r.deliveredAt || null,
      date: r.deliveredAt || r.createdAt || "",
      city: detectCity(visit?.visitCity, visit?.clientAddress || r.clientAddress),
      woodColor: mat?.woodColor || null,
      countertop: mat?.countertopName || null,
      weeks: weeksBetween(r.rendersApprovedAt || r.modeladoApprovedAt || r.clientApprovedAt || r.advanceReceivedAt, r.deliveredAt),
      media,
      videos: vids,
      publications: (pubs as any[]).filter((p) => p.projectId === r.id)
        .map((p) => ({ id: p.id, postType: p.postType, network: p.network, publishedAt: p.publishedAt })),
    });
  }
  // Más recientes primero (fecha de entrega o, si no hay, de creación)
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

/** Foto de portada: estrella en "Después" → cualquier estrella → última final → render → la primera. */
export function coverOf(p: PortfolioProject): string | null {
  const all = [...p.media.despues, ...p.media.diseno, ...p.media.instalacion, ...p.media.antes];
  return (
    p.media.despues.find((m) => m.starred)?.url ||
    all.find((m) => m.starred)?.url ||
    p.media.despues[p.media.despues.length - 1]?.url ||
    p.media.diseno[0]?.url ||
    all[0]?.url ||
    null
  );
}

export function countsOf(p: PortfolioProject) {
  return {
    antes: p.media.antes.length,
    diseno: p.media.diseno.length,
    instalacion: p.media.instalacion.length,
    despues: p.media.despues.length,
    videos: p.videos.length,
    stars: Object.values(p.media).flat().filter((m) => m.starred).length,
  };
}

/** Tipos de publicación que se pueden armar y los que ya se publicaron (en alguna red). */
export function postStatusOf(p: PortfolioProject): { available: SocialPostType[]; published: SocialPostType[] } {
  const available = availablePostTypes(countsOf(p));
  const published = Array.from(new Set(p.publications.map((x) => x.postType))) as SocialPostType[];
  return { available, published };
}
