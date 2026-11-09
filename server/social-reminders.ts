/**
 * Recordatorio de publicar en redes: lunes, miércoles y viernes desde las 9 a. m. (Colombia).
 * Si ese día toca publicar (plan semanal) y todavía no se ha publicado ese tipo en la semana,
 * avisa (campanita + push) a SOCIAL_REMINDER_ROLES con la publicación sugerida.
 * No se repite el mismo día aunque el servidor se reinicie (se revisa en la BD: últimas 16 h).
 */
import { and, eq, gte } from "drizzle-orm";
import * as db from "./db";
import { notifications } from "../drizzle/schema";
import { loadPortfolio, postStatusOf } from "./portfolio-data";
import {
  FALLBACK_POST_TYPE, SOCIAL_POST_TYPES, SOCIAL_REMINDER_ROLES, WEEKLY_PLAN,
  bogotaWeekday, bogotaYmd, weekStartYmd, type SocialPostType,
} from "@shared/socialPosts";

const REF_TYPE = "redes_recordatorio";

function bogotaHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now)) % 24;
}

/** Texto del aviso del día (o null si hoy no toca o ya se publicó). Se exporta para las pruebas. */
export async function buildSocialReminder(now = new Date()): Promise<{ title: string; body: string } | null> {
  const item = WEEKLY_PLAN.find((p) => p.weekday === bogotaWeekday(now));
  if (!item) return null;
  const d = await db.getDb();
  if (!d) return null;

  const all = await loadPortfolio(d);
  const weekStart = weekStartYmd(now);
  const publishedThisWeek = all.some((p) =>
    p.publications.some((x) => x.postType === item.type && bogotaYmd(new Date(`${x.publishedAt.replace(" ", "T")}Z`)) >= weekStart));
  if (publishedThisWeek) return null;

  const pick = (type: SocialPostType) => all.find((p) => {
    const s = postStatusOf(p);
    return s.available.includes(type) && !s.published.includes(type);
  });
  let type: SocialPostType = item.type;
  let project = pick(type);
  if (!project) { type = FALLBACK_POST_TYPE; project = pick(type); }

  const label = SOCIAL_POST_TYPES[type].label;
  if (!project) {
    return {
      title: `📣 Hoy toca publicar: ${SOCIAL_POST_TYPES[item.type].label}`,
      body: "No hay publicaciones listas: sube fotos finales o el video del recorrido de un proyecto entregado.",
    };
  }
  return {
    title: `📣 Hoy toca publicar: ${label}`,
    body: `Ya está lista: ${project.name}${project.city ? ` (${project.city})` : ""}. Abre Redes, descarga y publica.`,
  };
}

export async function sendSocialReminder(now = new Date()): Promise<number> {
  const d = await db.getDb();
  if (!d) return 0;
  const msg = await buildSocialReminder(now);
  if (!msg) return 0;

  const { createAndSendNotification } = await import("./push-notifications");
  const since = new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "");
  const ids = new Set<number>();
  for (const role of SOCIAL_REMINDER_ROLES) for (const u of await db.getUsersByRole(role)) ids.add(u.id);

  let sent = 0;
  for (const userId of Array.from(ids)) {
    const already = await d.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.referenceType, REF_TYPE), gte(notifications.createdAt, since)))
      .limit(1);
    if (already.length) continue;
    await createAndSendNotification(userId, { ...msg, type: "sistema", referenceType: REF_TYPE, url: "/redes" });
    sent++;
  }
  return sent;
}

export function startSocialReminders(): void {
  const tick = async () => {
    try {
      const h = bogotaHour(new Date());
      if (h >= 9 && h < 13) {
        const sent = await sendSocialReminder();
        if (sent) console.log(`[Redes] Recordatorio de publicar enviado a ${sent} usuario(s)`);
      }
    } catch (err) {
      console.error("[Redes] Error en el recordatorio de publicar:", err);
    }
  };
  setInterval(tick, 10 * 60 * 1000);
  setTimeout(tick, 90 * 1000);
  console.log("[Redes] Recordatorio programado (lunes, miércoles y viernes, 9 a. m. Colombia)");
}
