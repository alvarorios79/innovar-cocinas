/**
 * Avisos de postventa (campanita + push) a super_admin, admin y comercial.
 *
 * - Cada mañana (8 a 12, hora Colombia) se avisa cada mensaje del mes o revisión anual que ya venció
 *   y sigue pendiente. Un aviso por seguimiento (no se repite: se revisa si ya existe en la campanita).
 * - Cuando alguien lo atiende (Hecho / En revisión / No procede), se BORRA el aviso a todos
 *   (decisión de Álvaro: si Martha o comercial lo hacen, a él se le quita).
 */
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import * as db from "./db";
import { notifications, postventaReclamaciones, projects, clients, accountingClosureProjects, accountingClosures } from "../drizzle/schema";
import { POSTVENTA_NOTIFY_ROLES, POSTVENTA_REF } from "@shared/postventa";

/** Días mínimos entre dos mensajes iguales (mensaje del mes / revisión anual) al mismo cliente. */
export const DIAS_ENTRE_MENSAJES = 60;

async function teamIds(): Promise<number[]> {
  const ids = new Set<number>();
  for (const role of POSTVENTA_NOTIFY_ROLES) for (const u of await db.getUsersByRole(role)) ids.add(u.id);
  return Array.from(ids);
}

/** Avisa al equipo de un caso de postventa (referenceId = id del caso). */
export async function notifyPostventa(recId: number, title: string, body: string): Promise<number> {
  const { createAndSendNotification } = await import("./push-notifications");
  let n = 0;
  for (const userId of await teamIds()) {
    await createAndSendNotification(userId, { title, body, type: "proyecto", referenceId: recId, referenceType: POSTVENTA_REF, url: "/postventa" });
    n++;
  }
  return n;
}

/** Borra los avisos de ese caso a todo el equipo. */
export async function clearPostventaNotifications(recId: number): Promise<void> {
  const d = await db.getDb();
  if (!d) return;
  await d.delete(notifications).where(and(eq(notifications.referenceType, POSTVENTA_REF), eq(notifications.referenceId, recId)));
}

function bogotaHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now)) % 24;
}

/** Avisa los seguimientos vencidos que todavía no se han avisado. Devuelve cuántos casos se avisaron. */
export async function sendDuePostventaReminders(now = new Date()): Promise<number> {
  const d = await db.getDb();
  if (!d) return 0;
  const due = await d.select({
    id: postventaReclamaciones.id, type: postventaReclamaciones.type, projectName: projects.name, clientName: clients.name,
    clientId: projects.clientId, scheduledFor: postventaReclamaciones.scheduledFor,
  })
    .from(postventaReclamaciones)
    .innerJoin(projects, eq(projects.id, postventaReclamaciones.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(
      eq(postventaReclamaciones.status, "pendiente"),
      inArray(postventaReclamaciones.type, ["seguimiento_30d", "revision_anual"]),
      lte(postventaReclamaciones.scheduledFor, now.toISOString()),
      isNull(postventaReclamaciones.avisadoAt), // un solo aviso por seguimiento, aunque se limpie la campanita
    ));
  if (!due.length) return 0;
  // UN mensaje por CLIENTE, no por proyecto: si tiene varios proyectos, solo se avisa uno (el más reciente) y los demás
  // quedan marcados como avisados sin molestar. Tampoco se avisa si a ese cliente ya se le avisó lo mismo en los últimos 60 días.
  const hace60 = new Date(now.getTime() - DIAS_ENTRE_MENSAJES * 86400000).toISOString();
  const recientes = await d.select({ clientId: projects.clientId, type: postventaReclamaciones.type })
    .from(postventaReclamaciones).innerJoin(projects, eq(projects.id, postventaReclamaciones.projectId))
    .where(and(inArray(postventaReclamaciones.type, ["seguimiento_30d", "revision_anual"]), gte(postventaReclamaciones.avisadoAt, hace60)));
  const yaAvisado = new Set(recientes.map((r) => `${r.clientId}|${r.type}`));
  const ordenados = [...due].sort((a, b) => String(b.scheduledFor).localeCompare(String(a.scheduledFor)));
  let count = 0;
  for (const r of ordenados) {
    // Se marca ANTES de avisar: si algo falla a medias, mejor un aviso menos que repetirlo cada media hora
    await d.update(postventaReclamaciones).set({ avisadoAt: now.toISOString() } as any).where(eq(postventaReclamaciones.id, r.id));
    const clave = `${r.clientId}|${r.type}`;
    if (yaAvisado.has(clave)) continue; // este cliente ya tiene su aviso (de otro proyecto o reciente)
    yaAvisado.add(clave);
    const quien = r.clientName || r.projectName;
    if (r.type === "seguimiento_30d") {
      await notifyPostventa(r.id, `💬 Mensaje del mes: ${quien}`, `Envíale el WhatsApp de cómo le ha ido con su proyecto (con la reseña en Google). Toca para abrirlo.`);
    } else {
      await notifyPostventa(r.id, `🎁 Revisión de un año: ${quien}`, `Ofrécele la revisión gratuita y aprovecha para proponerle un mantenimiento.`);
    }
    count++;
  }
  return count;
}

export function startPostventaReminders(): void {
  const tick = async () => {
    try {
      const h = bogotaHour(new Date());
      if (h >= 8 && h < 18) {
        const n = await sendDuePostventaReminders();
        if (n) console.log(`[Postventa] ${n} seguimiento(s) vencido(s) avisado(s) al equipo`);
      }
    } catch (err) {
      console.error("[Postventa] Error en los avisos:", err);
    }
  };
  setInterval(tick, 30 * 60 * 1000);
  setTimeout(tick, 90 * 1000);
  // Reprogramación ÚNICA de los proyectos entregados (fecha real, sin duplicados, revisiones escalonadas)
  setTimeout(async () => {
    try {
      const { runPostventaReprogramOnce } = await import("./postventa-reprogram");
      await runPostventaReprogramOnce();
    } catch (err) {
      console.error("[Postventa] Error en la reprogramación:", err);
    }
  }, 60 * 1000);
  console.log("[Postventa] Avisos de seguimiento programados (8 a. m. – 6 p. m. Colombia)");
}

/** El proyecto volvió de "Entregado": se borran sus seguimientos automáticos aún pendientes (y sus avisos). */
export async function reopenPostventa(projectId: number): Promise<number> {
  const d = await db.getDb();
  if (!d) return 0;
  const pending = await d.select({ id: postventaReclamaciones.id }).from(postventaReclamaciones).where(and(
    eq(postventaReclamaciones.projectId, projectId),
    eq(postventaReclamaciones.status, "pendiente"),
    inArray(postventaReclamaciones.type, ["seguimiento_30d", "revision_anual"]),
  ));
  for (const r of pending) await clearPostventaNotifications(r.id);
  if (pending.length) {
    await d.delete(postventaReclamaciones).where(inArray(postventaReclamaciones.id, pending.map((r) => r.id)));
    console.log(`[Postventa] Proyecto ${projectId} volvió de Entregado: ${pending.length} seguimiento(s) pendiente(s) quitado(s)`);
  }
  return pending.length;
}

/** ¿El proyecto ya está en un cierre contable confirmado? (decisión de Álvaro: los cerrados no se tocan). */
export async function isInConfirmedClosure(projectId: number): Promise<boolean> {
  const d = await db.getDb();
  if (!d) return false;
  const rows = await d.select({ id: accountingClosureProjects.id }).from(accountingClosureProjects)
    .innerJoin(accountingClosures, eq(accountingClosures.id, accountingClosureProjects.closureId))
    .where(and(eq(accountingClosureProjects.projectId, projectId), eq(accountingClosures.status, "confirmed")))
    .limit(1);
  return rows.length > 0;
}


/**
 * Se cerró el mensaje del mes / la revisión de UN proyecto: los de los OTROS proyectos del mismo cliente (mismo tipo, aún
 * pendientes y con fecha dentro de los próximos 60 días o ya vencidos) quedan «cubiertos» por ese mismo mensaje.
 */
export async function cubrirSeguimientosDelCliente(recId: number, resueltoPor: number | null): Promise<number> {
  const d = await db.getDb();
  if (!d) return 0;
  const [rec] = await d.select({ type: postventaReclamaciones.type, clientId: projects.clientId })
    .from(postventaReclamaciones).innerJoin(projects, eq(projects.id, postventaReclamaciones.projectId))
    .where(eq(postventaReclamaciones.id, recId)).limit(1);
  if (!rec || (rec.type !== "seguimiento_30d" && rec.type !== "revision_anual")) return 0;
  const limite = new Date(Date.now() + DIAS_ENTRE_MENSAJES * 86400000).toISOString();
  const otros = await d.select({ id: postventaReclamaciones.id })
    .from(postventaReclamaciones).innerJoin(projects, eq(projects.id, postventaReclamaciones.projectId))
    .where(and(eq(projects.clientId, rec.clientId), eq(postventaReclamaciones.type, rec.type), eq(postventaReclamaciones.status, "pendiente"),
      lte(postventaReclamaciones.scheduledFor, limite)));
  let n = 0;
  for (const o of otros) {
    if (o.id === recId) continue;
    await d.update(postventaReclamaciones).set({ status: "resuelto", resolvedAt: new Date().toISOString(), resolvedBy: resueltoPor,
      resolvedNotes: "Cubierto por el mensaje enviado a este cliente por otro de sus proyectos" } as any).where(eq(postventaReclamaciones.id, o.id));
    await clearPostventaNotifications(o.id);
    n++;
  }
  return n;
}
