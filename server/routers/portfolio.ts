/**
 * Portafolio y Redes.
 * - portfolio.*: archivo de trabajos (Antes · Diseño · Instalación · Después + videos), estrellas.
 * - social.*: plan semanal de publicaciones, bandeja de publicaciones listas y registro de lo publicado.
 * Los videos se suben por /api/portfolio/videos (ver server/portfolio-routes.ts): son archivos grandes.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, gte } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { portfolioStars, projects, projectVideos, socialPublications } from "../../drizzle/schema";
import { canEditPortfolio, canViewPortfolio } from "@shared/portfolio";
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
    id: p.id, name: p.name, clientName: p.clientName, workType: p.workType, status: p.status, closed: p.closed,
    deliveredAt: p.deliveredAt, city: p.city, woodColor: p.woodColor, countertop: p.countertop,
    cover: coverOf(p), counts: countsOf(p), available, published,
  };
}

/** Fecha de la BD ("YYYY-MM-DD HH:mm:ss", UTC) → "YYYY-MM-DD" en Colombia. */
const ymdOf = (s: string) => bogotaYmd(new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`));

export const portfolioRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    assertView(ctx.user.role);
    const d = await database();
    return (await loadPortfolio(d)).map(summary);
  }),

  get: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertView(ctx.user.role);
      const d = await database();
      const [p] = await loadPortfolio(d, { projectIds: [input.projectId] });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Este proyecto aún no tiene fotos para el portafolio" });
      return { ...p, ...postStatusOf(p), cover: coverOf(p), counts: countsOf(p) };
    }),

  /** Marca o quita la estrella de una foto ("de las buenas"). */
  toggleStar: protectedProcedure
    .input(z.object({ projectId: z.number(), source: z.enum(["foto", "levantamiento"]), mediaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertEdit(ctx.user.role);
      const d = await database();
      const [p] = await loadPortfolio(d, { projectIds: [input.projectId] });
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
      return c ? { projectId: c.id, name: c.name, city: c.city, cover: c.cover, workType: c.workType } : null;
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
