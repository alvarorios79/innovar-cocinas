/**
 * «Conocimiento de Elena»: temas que la asistente de la página (cocinasintegralespereira.co) puede afirmar.
 * Los edita Álvaro (super_admin) o la administradora desde el CRM; la página los lee de GET /api/web/elena-conocimiento.
 */
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { elenaConocimiento } from "../../drizzle/schema";
import { sanitizeText } from "../sanitize";

export const ELENA_CATEGORIAS = ["info", "precio", "servicio", "proceso", "zona", "garantia", "promocion"] as const;

async function database() {
  const d = await db.getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
  return d;
}

const entrada = z.object({
  titulo: z.string().trim().min(3).max(200),
  categoria: z.enum(ELENA_CATEGORIAS).default("info"),
  contenido: z.string().trim().min(10).max(3000),
});

/** Temas activos, tal como los lee la página (solo lo necesario). */
export async function temasActivosParaWeb() {
  const d = await db.getDb();
  if (!d) return [];
  const filas = await d.select().from(elenaConocimiento).where(eq(elenaConocimiento.activo, 1)).orderBy(desc(elenaConocimiento.updatedAt));
  return filas.map((f) => ({ id: `crm-${f.id}`, titulo: f.titulo, categoria: f.categoria, contenido: f.contenido }));
}

export const elenaRouter = router({
  list: adminProcedure.query(async () => {
    const d = await database();
    return d.select().from(elenaConocimiento).orderBy(desc(elenaConocimiento.updatedAt));
  }),

  create: adminProcedure.input(entrada).mutation(async ({ input, ctx }) => {
    const d = await database();
    const [r] = await d.insert(elenaConocimiento).values({
      titulo: sanitizeText(input.titulo), categoria: input.categoria, contenido: sanitizeText(input.contenido), updatedBy: ctx.user.id,
    }).returning({ id: elenaConocimiento.id });
    return { id: r.id };
  }),

  update: adminProcedure.input(entrada.extend({ id: z.number().int() })).mutation(async ({ input, ctx }) => {
    const d = await database();
    await d.update(elenaConocimiento).set({
      titulo: sanitizeText(input.titulo), categoria: input.categoria, contenido: sanitizeText(input.contenido),
      updatedBy: ctx.user.id, updatedAt: new Date().toISOString(),
    }).where(eq(elenaConocimiento.id, input.id));
    return { ok: true };
  }),

  setActive: adminProcedure.input(z.object({ id: z.number().int(), activo: z.boolean() })).mutation(async ({ input, ctx }) => {
    const d = await database();
    await d.update(elenaConocimiento).set({ activo: input.activo ? 1 : 0, updatedBy: ctx.user.id, updatedAt: new Date().toISOString() }).where(eq(elenaConocimiento.id, input.id));
    return { ok: true };
  }),

  remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const d = await database();
    await d.delete(elenaConocimiento).where(eq(elenaConocimiento.id, input.id));
    return { ok: true };
  }),
});
