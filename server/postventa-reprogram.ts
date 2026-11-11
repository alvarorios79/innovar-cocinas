/**
 * Reprogramación ÚNICA de la postventa de los proyectos entregados (decisiones de Álvaro, 10 nov 2026):
 *  - Fecha real de entrega = la del calendario de instalaciones (programada > estimada > tentativa) si ya pasó;
 *    si no hay, la registrada. Los proyectos 1–13 se cargaron ya entregados y tienen en el calendario la misma
 *    fecha de relleno (15 abr 2026) → para ellos vale la registrada.
 *  - Llamada del mes: SOLO si todavía no se cumple el mes desde la entrega real (si ya pasó, se espera al año).
 *  - Revisión del año: escalonada (hay mucho trabajo a fin de año): ninguna antes del 15 ene 2027 (segunda quincena de enero) y a lo sumo
 *    una por día, martes y jueves.
 *  - Se borran TODOS los seguimientos automáticos pendientes (y sus avisos) y se crean de nuevo → quita duplicados.
 *  - Proyectos con cierre contable confirmado: no se toca el proyecto (ni su fecha); solo sus seguimientos.
 * Corre una sola vez (bandera en la tabla appFlags, a prueba de dos servidores arrancando a la vez).
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as db from "./db";
import { projects, clients, postventaReclamaciones } from "../drizzle/schema";
import { clearPostventaNotifications, isInConfirmedClosure } from "./postventa-reminders";

export const REPROGRAM_FLAG = "postventa_reprogramacion_v1";
const DAY = 86400000;
/** Fecha de relleno que quedó en el calendario de los proyectos cargados ya entregados (proyectos 1–13). */
const PLACEHOLDER_INSTALL_DATES = new Set(["2026-04-15"]);
/** Primera fecha posible para una revisión del año. */
export const ANNUAL_START = new Date("2027-01-15T14:00:00Z");

const iso = (v: any): string | null => {
  if (!v) return null;
  const s = String(v);
  const d = new Date(s.includes("T") || s.endsWith("Z") ? s : s.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export type ProjectDates = {
  id: number; deliveredAt: any; scheduledInstallDate?: any; estimatedInstallDate?: any; tentativeInstallDate?: any;
};

/** Fecha real de entrega y de dónde salió. */
export function realDelivery(p: ProjectDates, now = new Date()): { date: string | null; source: "calendario" | "registrada" | null } {
  const cal = iso(p.scheduledInstallDate) || iso(p.estimatedInstallDate) || iso(p.tentativeInstallDate);
  if (cal && !PLACEHOLDER_INSTALL_DATES.has(cal.slice(0, 10)) && new Date(cal) <= now) return { date: cal, source: "calendario" };
  const reg = iso(p.deliveredAt);
  if (reg) return { date: reg, source: "registrada" };
  if (cal && new Date(cal) <= now) return { date: cal, source: "calendario" };
  return { date: null, source: null };
}

/** Siguiente martes o jueves libre desde `from` (a lo sumo una revisión por día). */
function nextFreeDay(from: Date, taken: Set<string>): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 14));
  for (let i = 0; i < 800; i++) {
    const wd = d.getUTCDay(); // 2 = martes, 4 = jueves
    const key = d.toISOString().slice(0, 10);
    if ((wd === 2 || wd === 4) && !taken.has(key)) { taken.add(key); return new Date(d); }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

export type PlanRow = {
  projectId: number; realDate: string | null; source: string | null;
  followUp: string | null; annual: string | null;
};

/** Plan: llamada del mes (si aplica) y revisión del año escalonada. Puro: sin base de datos. */
export function buildPlan(list: ProjectDates[], now = new Date()): PlanRow[] {
  const withDates = list.map((p) => ({ p, ...realDelivery(p, now) }));
  const taken = new Set<string>();
  const ordered = [...withDates].filter((r) => r.date).sort((a, b) => a.date!.localeCompare(b.date!));
  const annual = new Map<number, string>();
  for (const r of ordered) {
    const anniversary = new Date(new Date(r.date!).getTime() + 365 * DAY);
    const from = anniversary > ANNUAL_START ? anniversary : ANNUAL_START;
    annual.set(r.p.id, nextFreeDay(from, taken).toISOString());
  }
  return withDates.map((r) => {
    const call = r.date ? new Date(new Date(r.date).getTime() + 30 * DAY) : null;
    return {
      projectId: r.p.id, realDate: r.date, source: r.source,
      followUp: call && call > now ? call.toISOString() : null,
      annual: annual.get(r.p.id) ?? null,
    };
  });
}

/** Corre la reprogramación una sola vez. Devuelve null si ya se había hecho. */
export async function runPostventaReprogramOnce(now = new Date()): Promise<null | { proyectos: number; llamadas: number; revisiones: number; fechas: number; quitados: number }> {
  const d = await db.getDb();
  if (!d) return null;
  const got: any = await d.execute(sql`INSERT INTO "appFlags" ("name") VALUES (${REPROGRAM_FLAG}) ON CONFLICT ("name") DO NOTHING RETURNING "name"`);
  const rows = (got?.rows ?? got) as any[];
  if (!rows?.length) return null; // ya se hizo (o la está haciendo otro servidor)

  const owner = (await db.getUsersByRole("super_admin"))[0];
  if (!owner) return null;
  const list = await d.select({
    id: projects.id, name: projects.name, clientName: clients.name, deliveredAt: projects.deliveredAt,
    scheduledInstallDate: projects.scheduledInstallDate, estimatedInstallDate: projects.estimatedInstallDate,
    tentativeInstallDate: projects.tentativeInstallDate,
  }).from(projects).leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(isNull(projects.deletedAt), eq(projects.status, "entregado" as any)));
  if (!list.length) return { proyectos: 0, llamadas: 0, revisiones: 0, fechas: 0, quitados: 0 };
  const ids = list.map((p) => p.id);

  // 1. Quitar todos los seguimientos automáticos pendientes (y sus avisos) → sin duplicados
  const old = await d.select({ id: postventaReclamaciones.id }).from(postventaReclamaciones).where(and(
    inArray(postventaReclamaciones.projectId, ids), eq(postventaReclamaciones.status, "pendiente"),
    inArray(postventaReclamaciones.type, ["seguimiento_30d", "revision_anual"]),
  ));
  for (const r of old) await clearPostventaNotifications(r.id);
  if (old.length) await d.delete(postventaReclamaciones).where(inArray(postventaReclamaciones.id, old.map((r) => r.id)));

  // 2. Fecha real + seguimientos nuevos
  const plan = buildPlan(list, now);
  let llamadas = 0, revisiones = 0, fechas = 0;
  for (const r of plan) {
    const p = list.find((x) => x.id === r.projectId)!;
    if (r.realDate && r.source === "calendario" && iso(p.deliveredAt) !== r.realDate && !(await isInConfirmedClosure(p.id))) {
      await d.update(projects).set({ deliveredAt: r.realDate }).where(eq(projects.id, p.id));
      fechas++;
    }
    if (r.followUp) {
      await db.createReclamacion({
        projectId: p.id, title: `Llamada de seguimiento — ${p.name}`,
        description: "Verificar satisfacción del cliente, revisar si hay ajustes pendientes y pedir la reseña en Google.",
        type: "seguimiento_30d", status: "pendiente", priority: "media", scheduledFor: r.followUp, createdBy: owner.id,
      } as any);
      llamadas++;
    }
    if (r.annual) {
      await db.createReclamacion({
        projectId: p.id, title: `Revisión de un año (regalo) — ${p.name}`,
        description: "Regalarle una revisión general (gratis). Si se encuentra algo para ajustar o un mantenimiento, se cotiza aparte y el cliente decide.",
        type: "revision_anual", status: "pendiente", priority: "baja", scheduledFor: r.annual, createdBy: owner.id,
      } as any);
      revisiones++;
    }
  }
  const res = { proyectos: list.length, llamadas, revisiones, fechas, quitados: old.length };
  console.log(`[Postventa] Reprogramación única: ${JSON.stringify(res)}`);
  try {
    const { createAndSendNotification } = await import("./push-notifications");
    const body = `Reprogramé la postventa de ${res.proyectos} proyectos entregados: ${llamadas} llamada(s) del mes (solo a quien no ha cumplido el mes) y ${revisiones} revisión(es) del año, escalonadas desde el 15 de enero de 2027.`;
    for (const u of await db.getUsersByRole("super_admin")) {
      await createAndSendNotification(u.id, { title: "🛡️ Postventa reprogramada", body, type: "proyecto", referenceType: "postventa_ajuste", url: "/postventa" });
    }
  } catch (e) { console.error("[Postventa] No se pudo avisar la reprogramación:", e); }
  return res;
}
