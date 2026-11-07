/**
 * Interesados (leads)
 * - publicRequest: página pública "Pide tu visita" (sin login). Avisa al equipo.
 * - create / list / update / markScheduled / remove: equipo comercial en el CRM.
 * El cliente NO agenda su cita: el equipo lo contacta por WhatsApp (313 680 2025) y agenda.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { leads } from "../../drizzle/schema";
import { sanitizeText } from "../sanitize";
import {
  LEAD_OPEN_STATUSES, LEAD_SOURCE_VALUES, LEAD_STATUS_VALUES, LEAD_WORK_TYPE_VALUES,
  leadSourceLabel, leadWorkTypesText, normalizeLeadPhone,
} from "@shared/leads";

const STAFF_ROLES = ["super_admin", "admin", "comercial"];
const NOTIFY_ROLES = ["super_admin", "admin", "comercial"];

function assertStaff(role: string) {
  if (!STAFF_ROLES.includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver interesados" });
}

async function database() {
  const d = await db.getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
  return d;
}

/** Aviso (campanita + push) a super_admin, admin y comercial. */
export async function notifyTeamNewLead(lead: { id: number; name: string; workTypes: string | null; location: string | null; source: string }, repeated = false) {
  try {
    const { createAndSendNotification } = await import("../push-notifications");
    const ids = new Set<number>();
    for (const role of NOTIFY_ROLES) for (const u of await db.getUsersByRole(role)) ids.add(u.id);
    const trabajo = leadWorkTypesText(lead.workTypes) || "sin especificar";
    const title = repeated ? `🔁 ${lead.name} volvió a pedir visita` : `🙋 Nuevo interesado: ${lead.name}`;
    const body = `${trabajo}${lead.location ? ` · ${lead.location}` : ""} · ${leadSourceLabel(lead.source)}. Escríbele por WhatsApp.`;
    for (const userId of Array.from(ids)) {
      await createAndSendNotification(userId, { title, body, type: "cita", referenceId: lead.id, referenceType: "lead", url: "/interesados" });
    }
  } catch (err) {
    console.error("[Interesados] No se pudo avisar al equipo:", err);
  }
}

// Límite simple contra spam en la página pública: 5 solicitudes cada 15 min por IP
const publicHits = new Map<string, number[]>();
function allowPublicRequest(ip: string): boolean {
  const now = Date.now(), windowMs = 15 * 60 * 1000;
  const hits = (publicHits.get(ip) || []).filter(t => now - t < windowMs);
  if (hits.length >= 5) { publicHits.set(ip, hits); return false; }
  hits.push(now);
  publicHits.set(ip, hits);
  if (publicHits.size > 5000) publicHits.clear();
  return true;
}

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const leadsRouter = router({
  /** Página pública "Pide tu visita". */
  publicRequest: publicProcedure
    .input(z.object({
      name: z.string().trim().min(2, "Escribe tu nombre").max(120),
      whatsappPhone: z.string().trim().min(7, "Escribe tu WhatsApp").max(25),
      countryCode: z.string().regex(/^\d{1,4}$/).default("57"),
      workTypes: z.array(z.enum(LEAD_WORK_TYPE_VALUES)).min(1, "Elige qué trabajo necesitas").max(6),
      location: optionalText(160),
      message: optionalText(1000),
      origin: z.enum(LEAD_SOURCE_VALUES).optional(),
      /** Campo trampa: las personas no lo ven; los robots lo llenan. */
      website: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.website) return { success: true }; // robot: se ignora en silencio
      const ip = String((ctx.req as any)?.ip || "desconocida");
      if (!allowPublicRequest(ip)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Ya recibimos tu solicitud. Si es urgente, escríbenos por WhatsApp." });
      }
      const phone = normalizeLeadPhone(input.whatsappPhone, input.countryCode);
      if (phone.length < 10 || phone.length > 15) throw new TRPCError({ code: "BAD_REQUEST", message: "Revisa el número de WhatsApp" });

      const d = await database();
      const fields = {
        name: sanitizeText(input.name),
        workTypes: input.workTypes.join(","),
        location: input.location ? sanitizeText(input.location) : null,
        message: input.message ? sanitizeText(input.message) : null,
      };

      // Si ya hay un interesado abierto con ese número, se actualiza (no se duplica)
      const [open] = await d.select().from(leads).where(and(
        eq(leads.whatsappPhone, phone), isNull(leads.deletedAt), inArray(leads.status, LEAD_OPEN_STATUSES),
      )).limit(1);
      if (open) {
        const message = [open.message, fields.message].filter(Boolean).join("\n— ");
        await d.update(leads).set({ ...fields, message: message || null, status: "nuevo", updatedAt: new Date().toISOString() }).where(eq(leads.id, open.id));
        void notifyTeamNewLead({ id: open.id, ...fields, source: open.source }, true); // en segundo plano
        return { success: true };
      }

      const [row] = await d.insert(leads).values({
        ...fields, whatsappPhone: phone, source: input.origin && input.origin !== "whatsapp" ? input.origin : "web", status: "nuevo",
      }).returning({ id: leads.id, source: leads.source });
      void notifyTeamNewLead({ id: row.id, ...fields, source: row.source }); // en segundo plano
      return { success: true };
    }),

  /** Lista para la pantalla Interesados. */
  list: protectedProcedure
    .input(z.object({ view: z.enum(["pendientes", "agendados", "descartados", "todos"]).default("pendientes") }).optional())
    .query(async ({ ctx, input }) => {
      assertStaff(ctx.user.role);
      const d = await database();
      const view = input?.view ?? "pendientes";
      const byView = view === "pendientes" ? inArray(leads.status, LEAD_OPEN_STATUSES)
        : view === "agendados" ? eq(leads.status, "cita_agendada")
        : view === "descartados" ? eq(leads.status, "descartado")
        : undefined;
      return d.select().from(leads)
        .where(and(isNull(leads.deletedAt), byView))
        .orderBy(desc(leads.createdAt))
        .limit(500);
    }),

  /** Números para el menú y el resumen: nuevos y seguimientos para hoy. */
  counts: protectedProcedure.query(async ({ ctx }) => {
    if (!STAFF_ROLES.includes(ctx.user.role)) return { nuevos: 0, seguimientosHoy: 0 };
    return leadCounts();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      assertStaff(ctx.user.role);
      const d = await database();
      const [row] = await d.select().from(leads).where(and(eq(leads.id, input.id), isNull(leads.deletedAt))).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Interesado no encontrado" });
      return row;
    }),

  /** Registro rápido de quien escribe por WhatsApp o redes. */
  create: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(120),
      whatsappPhone: z.string().trim().min(7).max(25),
      countryCode: z.string().regex(/^\d{1,4}$/).default("57"),
      workTypes: z.array(z.enum(LEAD_WORK_TYPE_VALUES)).max(6).default([]),
      source: z.enum(LEAD_SOURCE_VALUES).default("whatsapp"),
      location: optionalText(160),
      message: optionalText(1000),
      followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertStaff(ctx.user.role);
      const phone = normalizeLeadPhone(input.whatsappPhone, input.countryCode);
      if (phone.length < 10 || phone.length > 15) throw new TRPCError({ code: "BAD_REQUEST", message: "Revisa el número de WhatsApp" });
      const d = await database();
      const [row] = await d.insert(leads).values({
        name: sanitizeText(input.name),
        whatsappPhone: phone,
        workTypes: input.workTypes.join(",") || null,
        source: input.source,
        location: input.location ? sanitizeText(input.location) : null,
        message: input.message ? sanitizeText(input.message) : null,
        followUpDate: input.followUpDate || null,
        status: "contactado", // ya se habló con la persona por WhatsApp
        contactedAt: new Date().toISOString(),
        createdBy: ctx.user.id,
      }).returning({ id: leads.id });
      return { id: row.id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(LEAD_STATUS_VALUES).optional(),
      followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
      name: z.string().trim().min(2).max(120).optional(),
      location: z.string().max(160).nullable().optional(),
      workTypes: z.array(z.enum(LEAD_WORK_TYPE_VALUES)).max(6).optional(),
      source: z.enum(LEAD_SOURCE_VALUES).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertStaff(ctx.user.role);
      const d = await database();
      const [cur] = await d.select().from(leads).where(and(eq(leads.id, input.id), isNull(leads.deletedAt))).limit(1);
      if (!cur) throw new TRPCError({ code: "NOT_FOUND", message: "Interesado no encontrado" });
      const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (input.status) {
        set.status = input.status;
        if (input.status === "contactado" && !cur.contactedAt) set.contactedAt = new Date().toISOString();
      }
      if (input.followUpDate !== undefined) set.followUpDate = input.followUpDate;
      if (input.notes !== undefined) set.notes = input.notes ? sanitizeText(input.notes) : null;
      if (input.name) set.name = sanitizeText(input.name);
      if (input.location !== undefined) set.location = input.location ? sanitizeText(input.location) : null;
      if (input.workTypes) set.workTypes = input.workTypes.join(",") || null;
      if (input.source) set.source = input.source;
      await d.update(leads).set(set as any).where(eq(leads.id, input.id));
      return { success: true };
    }),

  /** Después de crear la cita en el calendario: queda enlazada y en "Cita agendada". */
  markScheduled: protectedProcedure
    .input(z.object({ id: z.number(), appointmentId: z.number(), clientId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      assertStaff(ctx.user.role);
      const d = await database();
      await d.update(leads).set({
        status: "cita_agendada", appointmentId: input.appointmentId, clientId: input.clientId ?? null,
        followUpDate: null, updatedAt: new Date().toISOString(),
      }).where(eq(leads.id, input.id));
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertStaff(ctx.user.role);
      const d = await database();
      await d.update(leads).set({ deletedAt: new Date().toISOString() }).where(eq(leads.id, input.id));
      return { success: true };
    }),
});

/** Hoy en Colombia como "YYYY-MM-DD". */
export function bogotaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function leadCounts(now = new Date()) {
  const d = await db.getDb();
  if (!d) return { nuevos: 0, seguimientosHoy: 0 };
  const today = bogotaToday(now);
  const [r] = await d.select({
    nuevos: sql<number>`count(*) filter (where ${leads.status} = 'nuevo')`,
    seguimientosHoy: sql<number>`count(*) filter (where ${leads.followUpDate} <= ${today})`,
  }).from(leads).where(and(isNull(leads.deletedAt), inArray(leads.status, LEAD_OPEN_STATUSES)));
  return { nuevos: Number(r?.nuevos || 0), seguimientosHoy: Number(r?.seguimientosHoy || 0) };
}

