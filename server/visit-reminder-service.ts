/**
 * Servicio de recordatorios de visitas técnicas para medidores
 * Envía notificación push al medidor el día anterior a la visita, a las 7:00 PM (Colombia)
 * Se ejecuta cada hora; dispara solo cuando hour === 19
 */

import { getDb } from "./db";
import { technicalVisits } from "../drizzle/schema";
import { and, gte, lte, isNotNull } from "drizzle-orm";

// Registro en memoria de visitas ya notificadas hoy (se limpia al cambiar de día)
const notifiedVisits = new Set<number>();
let lastCleanupDate: string | null = null;

function cleanupIfNewDay() {
  const today = new Date().toISOString().split("T")[0];
  if (lastCleanupDate !== today) {
    notifiedVisits.clear();
    lastCleanupDate = today;
  }
}

/**
 * Obtiene las visitas técnicas programadas para mañana con medidor asignado
 */
async function getTomorrowVisitsWithMedidor() {
  const database = await getDb();
  if (!database) return [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfDay = new Date(tomorrow);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(tomorrow);
  endOfDay.setHours(23, 59, 59, 999);

  const visits = await database
    .select()
    .from(technicalVisits)
    .where(
      and(
        // @ts-ignore
        gte(technicalVisits.scheduledDate, startOfDay),
        // @ts-ignore
        lte(technicalVisits.scheduledDate, endOfDay),
        isNotNull(technicalVisits.assignedTo)
      )
    );

  // Solo visitas en borrador (el medidor aún no las ha enviado)
  return visits.filter(v => v.status === "borrador");
}

/**
 * Envía recordatorio push a cada medidor con visita mañana
 */
export async function sendVisitReminders(): Promise<{
  checked: number;
  sent: number;
  errors: number;
}> {
  let checked = 0;
  let sent = 0;
  let errors = 0;

  try {
    cleanupIfNewDay();
    const visits = await getTomorrowVisitsWithMedidor();
    checked = visits.length;

    console.log(`[VisitReminder] ${checked} visita(s) programadas para mañana con medidor asignado`);

    for (const visit of visits) {
      // Evitar duplicados dentro del mismo día
      if (notifiedVisits.has(visit.id)) continue;
      if (!visit.assignedTo) continue;

      try {
        const { createAndSendNotification } = await import("./push-notifications");

        const scheduledDate = visit.scheduledDate ? new Date(visit.scheduledDate) : new Date();
        const dateFormatted = scheduledDate.toLocaleDateString("es-CO", {
          weekday: "long",
          day:     "2-digit",
          month:   "long",
          hour:    "2-digit",
          minute:  "2-digit",
          timeZone: "America/Bogota",
        });

        await createAndSendNotification(visit.assignedTo, {
          title: `📐 Visita técnica mañana`,
          body:  `${visit.clientName}${visit.clientAddress ? ` · ${visit.clientAddress}` : ""} — ${dateFormatted}`,
          type:  "proyecto",
          url:   `/medidor`,
        });

        notifiedVisits.add(visit.id);
        sent++;
        console.log(
          `[VisitReminder] Notificación enviada al medidor ${visit.assignedTo} ` +
          `para visita ${visit.id} (${visit.clientName})`
        );
      } catch (err) {
        console.error(`[VisitReminder] Error notificando visita ${visit.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[VisitReminder] Error general:", err);
  }

  return { checked, sent, errors };
}

/** Retorna la hora actual en zona horaria Colombia (UTC-5, sin DST) */
function getColombiaHour(): number {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  ).getHours();
}

/**
 * Programa el servicio — se ejecuta cada hora y dispara a las 7:00 PM Colombia
 */
export function startVisitReminderService(): void {
  // Verificar cada hora
  setInterval(async () => {
    const hour = getColombiaHour();
    if (hour === 19) {
      console.log("[VisitReminder] Ejecutando recordatorios de visitas técnicas (7PM Colombia)");
      const result = await sendVisitReminders();
      console.log(
        `[VisitReminder] Resultado: ${result.checked} revisadas, ` +
        `${result.sent} notificaciones enviadas, ${result.errors} errores`
      );
    }
  }, 60 * 60 * 1000);

  // Ejecutar de inmediato si el servidor arranca entre las 7 y las 8 PM Colombia
  const hour = getColombiaHour();
  if (hour >= 19 && hour <= 20) {
    setTimeout(async () => {
      console.log("[VisitReminder] Verificación inicial al arrancar el servidor");
      const result = await sendVisitReminders();
      console.log(
        `[VisitReminder] Inicial: ${result.checked} revisadas, ${result.sent} enviadas`
      );
    }, 50_000); // 50 segundos después del boot
  }

  console.log("[VisitReminder] Servicio de recordatorios de visitas técnicas programado (7PM Colombia)");
}
