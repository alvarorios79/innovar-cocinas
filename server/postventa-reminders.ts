/**
 * Avisos de postventa (campanita + push) a super_admin, admin y comercial.
 *
 * - Cada mañana (8 a 12, hora Colombia) se avisa cada seguimiento de 30 días o revisión anual que ya venció
 *   y sigue pendiente. Un aviso por seguimiento (no se repite: se revisa si ya existe en la campanita).
 * - Cuando alguien lo atiende (Hecho / En revisión / No procede), se BORRA el aviso a todos
 *   (decisión de Álvaro: si Martha o comercial lo hacen, a él se le quita).
 */
import { and, eq, inArray, lte } from "drizzle-orm";
import * as db from "./db";
import { notifications, postventaReclamaciones, projects, clients } from "../drizzle/schema";
import { POSTVENTA_NOTIFY_ROLES, POSTVENTA_REF } from "@shared/postventa";

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
  })
    .from(postventaReclamaciones)
    .innerJoin(projects, eq(projects.id, postventaReclamaciones.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(
      eq(postventaReclamaciones.status, "pendiente"),
      inArray(postventaReclamaciones.type, ["seguimiento_30d", "revision_anual"]),
      lte(postventaReclamaciones.scheduledFor, now.toISOString()),
    ));
  if (!due.length) return 0;
  const already = new Set((await d.select({ ref: notifications.referenceId }).from(notifications)
    .where(and(eq(notifications.referenceType, POSTVENTA_REF), inArray(notifications.referenceId, due.map((r) => r.id)))))
    .map((r) => r.ref));
  let count = 0;
  for (const r of due) {
    if (already.has(r.id)) continue;
    const quien = r.clientName || r.projectName;
    if (r.type === "seguimiento_30d") {
      await notifyPostventa(r.id, `📞 Llamada de 30 días: ${quien}`, `Pregúntale cómo le ha ido con su proyecto y pídele la reseña en Google. Toca para enviarle el WhatsApp.`);
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
  console.log("[Postventa] Avisos de seguimiento programados (8 a. m. – 6 p. m. Colombia)");
}
