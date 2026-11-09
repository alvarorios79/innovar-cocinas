/**
 * Portafolio y Redes.
 * - portfolio.*: archivo de trabajos (Antes · Diseño · Instalación · Después + videos), estrellas.
 * - social.*: plan semanal de publicaciones, bandeja de publicaciones listas y registro de lo publicado.
 * Los videos se suben por /api/portfolio/videos (ver server/portfolio-routes.ts): son archivos grandes.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  clients, photoTrash, portfolioHidden, portfolioHistoric, portfolioStars, projectPhotos, projects, projectVideos, socialPublications, technicalVisitPhotos,
} from "../../drizzle/schema";
import { SECTION_UPLOAD_TARGET, canEditPortfolio, canViewPortfolio, type PortfolioSection } from "@shared/portfolio";
import { HISTORIC_KINDS, historicName, parseHistoricKinds, projectWorkTypeFor, type WorkKind } from "@shared/workTypes";
import {
  FALLBACK_POST_TYPE, SOCIAL_NETWORK_KEYS, SOCIAL_POST_TYPE_KEYS, WEEKLY_PLAN,
  bogotaWeekday, bogotaYmd, monthStartYmd, weekStartYmd, type SocialPostType,
} from "@shared/socialPosts";
import { countsOf, coverOf, loadPortfolio, postStatusOf, type PortfolioProject } from "../portfolio-data";

async function database() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
  return d;
}
function assertView(role: string) {
  if (!canViewPortfolio(role)) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso al portafolio" });
}
function assertEdit(role: string) {
  if (!canEditPortfolio(role)) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para modificar el portafolio" });
}

/** Resumen para la lista (sin todas las fotos). */
function summary(p: PortfolioProject) {
  const { available, published } = postStatusOf(p);
  return {
    id: p.id, name: p.name, clientName: p.clientName, workType: p.workType, works: p.works, status: p.status, closed: p.closed,
    delivered: p.delivered, hidden: p.hidden, historic: p.historic,
    deliveredAt: p.deliveredAt, date: p.date, city: p.city, woodColor: p.woodColor, countertop: p.countertop,
    cover: coverOf(p), counts: countsOf(p), available, published,
  };
}

/** Fecha de la BD ("YYYY-MM-DD HH:mm:ss", UTC) → "YYYY-MM-DD" en Colombia. */
const ymdOf = (s: string) => bogotaYmd(new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`));

/** Días que una foto eliminada se puede restaurar desde la papelera. */
const TRASH_DAYS = 30;

async function purgeOldTrash(d: any) {
  const limit = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "");
  await d.delete(photoTrash).where(lt(photoTrash.createdAt, limit));
}

const mediaItem = z.object({ source: z.enum(["foto", "levantamiento"]), id: z.number() });
const keyOf = (source: string, id: number) => `${source === "levantamiento" ? "lev" : "foto"}-${id}`;

export const portfolioRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    assertView(ctx.user.role);
    const d = await database();
    return (await loadPortfolio(d, { includeEmpty: true, includeHidden: true })).map(summary);
  }),

  get: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertView(ctx.user.role);
      const d = await database();
      const [p] = await loadPortfolio(d, { projectIds: [input.projectId], includeEmpty: true, includeHidden: true });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
      return { ...p, ...postStatusOf(p), cover: coverOf(p), counts: countsOf(p) };
    }),

  /** Marca o quita la estrella de una foto ("de las buenas"). */
  toggleStar: protectedProcedure
    .input(z.object({ projectId: z.number(), source: z.enum(["foto", "levantamiento"]), mediaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const [p] = await loadPortfolio(d, { projectIds: [input.projectId], includeHidden: true });
      const key = `${input.source === "levantamiento" ? "lev" : "foto"}-${input.mediaId}`;
      const media = p && Object.values(p.media).flat().find((m) => m.key === key);
      if (!media) throw new TRPCError({ code: "NOT_FOUND", message: "Foto no encontrada en este proyecto" });

      if (media.starred) {
        await d.delete(portfolioStars).where(and(eq(portfolioStars.source, input.source), eq(portfolioStars.mediaId, input.mediaId)));
        return { starred: false };
      }
      await d.insert(portfolioStars)
        .values({ projectId: input.projectId, source: input.source, mediaId: input.mediaId, createdBy: ctx.user.id })
        .onConflictDoNothing();
      return { starred: true };
    }),

  /** Quita un video del portafolio (el archivo queda guardado por si acaso). */
  deleteVideo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      await d.update(projectVideos).set({ deletedAt: new Date().toISOString() }).where(eq(projectVideos.id, input.id));
      return { success: true };
    }),

  /**
   * Quitar / restaurar la galería de un proyecto del Portafolio (para dejar solo los más bonitos).
   * No borra ninguna foto ni video: siguen guardados en el proyecto.
   */
  setHidden: protectedProcedure
    .input(z.object({ projectId: z.number(), hidden: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      if (input.hidden) {
        await d.insert(portfolioHidden).values({ projectId: input.projectId, hiddenBy: ctx.user.id }).onConflictDoNothing();
      } else {
        await d.delete(portfolioHidden).where(eq(portfolioHidden.projectId, input.projectId));
      }
      return { hidden: input.hidden };
    }),

  /**
   * Eliminar fotos (una o varias) → papelera. La fila se guarda completa en `photoTrash` y se quita de su
   * tabla, así desaparece del portafolio Y del proyecto. El archivo no se borra: "Restaurar" la devuelve.
   */
  deleteMedia: protectedProcedure
    .input(z.object({ projectId: z.number(), items: z.array(mediaItem).min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const [p] = await loadPortfolio(d, { projectIds: [input.projectId], includeEmpty: true, includeHidden: true });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
      const valid = new Set(Object.values(p.media).flat().map((m) => m.key));
      const items = input.items.filter((it) => valid.has(keyOf(it.source, it.id)));
      if (!items.length) throw new TRPCError({ code: "NOT_FOUND", message: "Esas fotos no están en este proyecto" });

      const fotoIds = items.filter((i) => i.source === "foto").map((i) => i.id);
      const levIds = items.filter((i) => i.source === "levantamiento").map((i) => i.id);
      let moved = 0;
      await d.transaction(async (tx: any) => {
        if (fotoIds.length) {
          const rows = await tx.select().from(projectPhotos).where(inArray(projectPhotos.id, fotoIds));
          if (rows.length) {
            await tx.insert(photoTrash).values(rows.map((r: any) => ({ projectId: input.projectId, source: "foto", originalId: r.id, data: r, deletedBy: ctx.user.id })));
            await tx.delete(portfolioStars).where(and(eq(portfolioStars.source, "foto"), inArray(portfolioStars.mediaId, fotoIds)));
            await tx.delete(projectPhotos).where(inArray(projectPhotos.id, fotoIds));
            moved += rows.length;
          }
        }
        if (levIds.length) {
          const rows = await tx.select().from(technicalVisitPhotos).where(inArray(technicalVisitPhotos.id, levIds));
          if (rows.length) {
            await tx.insert(photoTrash).values(rows.map((r: any) => ({ projectId: input.projectId, source: "levantamiento", originalId: r.id, data: r, deletedBy: ctx.user.id })));
            await tx.delete(portfolioStars).where(and(eq(portfolioStars.source, "levantamiento"), inArray(portfolioStars.mediaId, levIds)));
            await tx.delete(technicalVisitPhotos).where(inArray(technicalVisitPhotos.id, levIds));
            moved += rows.length;
          }
        }
      });
      await purgeOldTrash(d);
      return { deleted: moved };
    }),

  /**
   * Mover fotos a otro bloque y, si se indica, a OTRO proyecto (cuando se subieron en la galería equivocada).
   * Solo fotos del proyecto, no las del levantamiento. No cambia la etapa de ningún proyecto.
   */
  moveMedia: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      ids: z.array(z.number()).min(1).max(300),
      section: z.enum(["antes", "diseno", "instalacion", "despues"]),
      targetProjectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const t = SECTION_UPLOAD_TARGET[input.section as PortfolioSection];
      const target = input.targetProjectId && input.targetProjectId !== input.projectId ? input.targetProjectId : null;
      if (target) {
        // Destino válido: proyecto no borrado, o un histórico del Portafolio
        const [p] = await d.select({ id: projects.id, deletedAt: projects.deletedAt }).from(projects).where(eq(projects.id, target));
        const [h] = await d.select({ id: portfolioHistoric.projectId }).from(portfolioHistoric).where(eq(portfolioHistoric.projectId, target));
        if (!p || (p.deletedAt && !h)) throw new TRPCError({ code: "NOT_FOUND", message: "El proyecto de destino no existe" });
      }
      const res = await d.transaction(async (tx: any) => {
        const moved = await tx.update(projectPhotos)
          .set({ stage: t.stage, category: t.category, subcategory: t.subcategory, ...(target ? { projectId: target } : {}) } as any)
          .where(and(eq(projectPhotos.projectId, input.projectId), inArray(projectPhotos.id, input.ids)))
          .returning({ id: projectPhotos.id });
        // Las estrellas se van con la foto
        if (target && moved.length) {
          await tx.update(portfolioStars).set({ projectId: target })
            .where(and(eq(portfolioStars.source, "foto"), inArray(portfolioStars.mediaId, moved.map((m: any) => m.id))));
        }
        return moved;
      });
      if (target) console.log(`[Portafolio] ${res.length} foto(s) movidas del proyecto ${input.projectId} al ${target} (${input.section}) por ${ctx.user.id}`);
      return { moved: res.length, targetProjectId: target };
    }),

  /** Papelera del proyecto (últimos 30 días). */
  trash: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      await purgeOldTrash(d);
      const rows = await d.select().from(photoTrash).where(eq(photoTrash.projectId, input.projectId)).orderBy(desc(photoTrash.createdAt));
      return rows.map((r: any) => ({
        id: r.id,
        source: r.source as "foto" | "levantamiento",
        url: (r.data?.photoUrl || r.data?.url || "") as string,
        deletedAt: r.createdAt as string,
        daysLeft: Math.max(0, TRASH_DAYS - Math.floor((Date.now() - new Date(`${String(r.createdAt).replace(" ", "T")}Z`).getTime()) / 86400000)),
      }));
    }),

  /** Restaurar fotos de la papelera a su lugar original. */
  restoreMedia: protectedProcedure
    .input(z.object({ projectId: z.number(), trashIds: z.array(z.number()).min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const rows = await d.select().from(photoTrash)
        .where(and(eq(photoTrash.projectId, input.projectId), inArray(photoTrash.id, input.trashIds)));
      let restored = 0;
      const failed: number[] = [];
      for (const r of rows as any[]) {
        try {
          await d.transaction(async (tx: any) => {
            const data = { ...(r.data || {}) };
            if (r.source === "foto") await tx.insert(projectPhotos).values(data).onConflictDoNothing();
            else await tx.insert(technicalVisitPhotos).values(data).onConflictDoNothing();
            await tx.delete(photoTrash).where(eq(photoTrash.id, r.id));
          });
          restored++;
        } catch (err) {
          console.error("[Portafolio] No se pudo restaurar la foto de la papelera", r.id, err);
          failed.push(r.id);
        }
      }
      return { restored, failed: failed.length };
    }),

  /**
   * Nuevo trabajo histórico (anterior al CRM): solo se elige qué es (cocina, closet…), sin datos del cliente.
   * Se guarda como proyecto "solo Portafolio": con deletedAt (ninguna otra pantalla lo muestra) + portfolioHistoric.
   */
  createHistoric: protectedProcedure
    .input(z.object({ workKind: z.enum(HISTORIC_KINDS as [WorkKind, ...WorkKind[]]) }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const now = new Date().toISOString();
      // Cliente oculto para todos los históricos (projects.clientId es obligatorio)
      const HIST_CLIENT = "Innovar · Trabajos históricos";
      let [cli] = await d.select({ id: clients.id }).from(clients).where(eq(clients.name, HIST_CLIENT)).limit(1);
      if (!cli) {
        [cli] = await d.insert(clients).values({ name: HIST_CLIENT, whatsappPhone: "0", deletedAt: now } as any).returning({ id: clients.id });
      }
      const existing = await d.select({ workKind: portfolioHistoric.workKind }).from(portfolioHistoric);
      const n = existing.filter((e: any) => parseHistoricKinds(e.workKind)[0] === input.workKind).length + 1;
      const name = historicName(input.workKind, n);
      const [proj] = await d.insert(projects).values({
        clientId: cli.id, name, workType: projectWorkTypeFor(null, [{ itemType: input.workKind === "puertas" ? "puerta" : input.workKind }]),
        status: "entregado", createdBy: ctx.user.id, deletedAt: now, isArchived: 0,
      } as any).returning({ id: projects.id });
      await d.insert(portfolioHistoric).values({ projectId: proj.id, workKind: input.workKind, createdBy: ctx.user.id });
      return { projectId: proj.id, name };
    }),

  /** Qué incluye un histórico (uno o varios trabajos: cocina + closet…). El nombre no cambia. */
  setHistoricKinds: protectedProcedure
    .input(z.object({ projectId: z.number(), kinds: z.array(z.enum(HISTORIC_KINDS as [WorkKind, ...WorkKind[]])).min(1).max(8) }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const kinds = parseHistoricKinds(input.kinds.join(","));
      const res = await d.update(portfolioHistoric).set({ workKind: kinds.join(",") })
        .where(eq(portfolioHistoric.projectId, input.projectId)).returning({ id: portfolioHistoric.projectId });
      if (!res.length) throw new TRPCError({ code: "NOT_FOUND", message: "No es un trabajo histórico" });
      return { kinds };
    }),
});

export const socialRouter = router({
  /** Plan de la semana, bandeja de publicaciones listas y lo publicado. */
  overview: protectedProcedure.query(async ({ ctx }) => {
    assertView(ctx.user.role);
    const d = await database();
    const all = await loadPortfolio(d);
    const now = new Date();
    const weekStart = weekStartYmd(now);
    const monthStart = monthStartYmd(now);
    const today = bogotaYmd(now);
    const todayWeekday = bogotaWeekday(now);

    const pubs = all.flatMap((p) => p.publications.map((x) => ({ ...x, projectId: p.id, projectName: p.name, ymd: ymdOf(x.publishedAt) })));
    const thisWeek = pubs.filter((x) => x.ymd >= weekStart);
    const thisMonth = pubs.filter((x) => x.ymd >= monthStart);
    // Una "publicación" = proyecto + tipo (aunque se suba a varias redes)
    const distinct = (list: typeof pubs) => new Set(list.map((x) => `${x.projectId}-${x.postType}`)).size;

    // Bandeja: por proyecto, los tipos que se pueden armar y aún no se han publicado
    const tray = all
      .map((p) => {
        const s = summary(p);
        return { ...s, pending: s.available.filter((t) => !s.published.includes(t)) };
      })
      .filter((p) => p.pending.length > 0);

    /** Proyecto sugerido para un tipo: el más reciente con ese tipo pendiente (con estrellas primero). */
    const suggest = (type: SocialPostType) => {
      const cands = tray.filter((p) => p.pending.includes(type));
      cands.sort((a, b) => (b.counts.stars > 0 ? 1 : 0) - (a.counts.stars > 0 ? 1 : 0));
      const c = cands[0];
      return c ? { projectId: c.id, name: c.clientName ? `${c.clientName} · ${c.name}` : c.name, city: c.city, cover: c.cover, workType: c.workType, works: c.works } : null;
    };

    const plan = WEEKLY_PLAN.map((item) => {
      // fecha del día del plan en esta semana
      const [y, m, dd] = weekStart.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, dd + item.weekday - 1)).toISOString().slice(0, 10);
      const done = thisWeek.find((x) => x.postType === item.type) || null;
      const suggestion = suggest(item.type);
      const fallback = !suggestion ? suggest(FALLBACK_POST_TYPE) : null;
      return {
        ...item, date,
        isToday: date === today,
        isPast: date < today,
        done: done ? { projectId: done.projectId, projectName: done.projectName, network: done.network } : null,
        suggestion: suggestion ? { ...suggestion, type: item.type } : fallback ? { ...fallback, type: FALLBACK_POST_TYPE } : null,
      };
    });

    return {
      today, todayWeekday, weekStart,
      plan,
      tray,
      stats: {
        week: distinct(thisWeek), weekGoal: WEEKLY_PLAN.length,
        month: distinct(thisMonth),
        byNetwork: Object.fromEntries(SOCIAL_NETWORK_KEYS.map((n) => [n, thisMonth.filter((x) => x.network === n).length])),
        projects: all.length,
      },
      recent: pubs.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 30),
    };
  }),

  markPublished: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      postType: z.enum(SOCIAL_POST_TYPE_KEYS as [SocialPostType, ...SocialPostType[]]),
      network: z.enum(SOCIAL_NETWORK_KEYS as ["instagram", "facebook", "tiktok"]),
    }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const [proj] = await d.select({ id: projects.id }).from(projects).where(eq(projects.id, input.projectId));
      if (!proj) throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
      // No duplicar si se marca dos veces el mismo día
      const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "");
      const [dup] = await d.select({ id: socialPublications.id }).from(socialPublications).where(and(
        eq(socialPublications.projectId, input.projectId), eq(socialPublications.postType, input.postType),
        eq(socialPublications.network, input.network), gte(socialPublications.publishedAt, since),
      ));
      if (dup) return { id: dup.id, duplicated: true };
      const [row] = await d.insert(socialPublications)
        .values({ ...input, publishedBy: ctx.user.id })
        .returning({ id: socialPublications.id });
      return { id: row.id, duplicated: false };
    }),

  unmarkPublished: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      await d.delete(socialPublications).where(eq(socialPublications.id, input.id));
      return { success: true };
    }),

});
