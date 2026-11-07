/**
 * Resumen diario de interesados (8:00 a. m. hora Colombia).
 * "Tienes 3 interesados sin contestar y 2 seguimientos para hoy" → campanita + push
 * a super_admin, admin y comercial. Si no hay nada pendiente, no se envía.
 * No se repite el mismo día aunque el servidor se reinicie (se revisa en la BD: últimas 16 h).
 */
import { and, eq, gte } from "drizzle-orm";
import * as db from "./db";
import { notifications } from "../drizzle/schema";
import { leadCounts } from "./routers/leads";

const ROLES = ["super_admin", "admin", "comercial"];
const REF_TYPE = "lead_resumen";

function bogotaHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now)) % 24;
}


export function buildLeadSummaryText(nuevos: number, seguimientos: number): string | null {
  const parts: string[] = [];
  if (nuevos > 0) parts.push(`${nuevos} ${nuevos === 1 ? "interesado sin contestar" : "interesados sin contestar"}`);
  if (seguimientos > 0) parts.push(`${seguimientos} ${seguimientos === 1 ? "seguimiento para hoy" : "seguimientos para hoy"}`);
  return parts.length ? `Tienes ${parts.join(" y ")}.` : null;
}

export async function sendLeadsDailySummary(now = new Date()): Promise<number> {
  const d = await db.getDb();
  if (!d) return 0;
  const { nuevos, seguimientosHoy } = await leadCounts(now);
  const body = buildLeadSummaryText(nuevos, seguimientosHoy);
  if (!body) return 0;

  const { createAndSendNotification } = await import("./push-notifications");
  // "Ya se mandó hoy" = hay un resumen en las últimas 16 h. El envío es entre 8 y 12 a. m.,
  // así que el de ayer siempre queda por fuera, aunque la BD guarde la hora en otra zona.
  const since = new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "");
  const ids = new Set<number>();
  for (const role of ROLES) for (const u of await db.getUsersByRole(role)) ids.add(u.id);

  let sent = 0;
  for (const userId of Array.from(ids)) {
    const already = await d.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.referenceType, REF_TYPE), gte(notifications.createdAt, since)))
      .limit(1);
    if (already.length) continue;
    await createAndSendNotification(userId, { title: "☀️ Interesados de hoy", body, type: "cita", referenceType: REF_TYPE, url: "/interesados" });
    sent++;
  }
  return sent;
}

export function startLeadsDailySummary(): void {
  const tick = async () => {
    try {
      const h = bogotaHour(new Date());
      if (h >= 8 && h < 12) {
        const sent = await sendLeadsDailySummary();
        if (sent) console.log(`[Interesados] Resumen diario enviado a ${sent} usuario(s)`);
      }
    } catch (err) {
      console.error("[Interesados] Error en el resumen diario:", err);
    }
  };
  setInterval(tick, 10 * 60 * 1000);
  setTimeout(tick, 60 * 1000);
  console.log("[Interesados] Resumen diario programado (8:00 a. m. Colombia)");
}
