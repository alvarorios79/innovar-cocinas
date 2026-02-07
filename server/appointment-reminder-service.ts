/**
 * Servicio de recordatorios automáticos de citas por WhatsApp
 * Envía recordatorio al cliente el día anterior a la cita
 * Se ejecuta 2 veces al día: 8am y 12pm (solo envía WhatsApp 1 vez)
 */

import * as db from "./db";
import { getDb } from "./db";
import * as whatsappCloud from "./whatsapp-cloud";
import { appointments, appointmentWorkTypes } from "../drizzle/schema";
import { and, gte, lte, eq, inArray } from "drizzle-orm";

// Registro de citas ya notificadas por WhatsApp hoy (se limpia cada día)
const notifiedAppointments = new Set<number>();
let lastCleanupDate: string | null = null;

/**
 * Limpia el registro de citas notificadas al cambiar de día
 */
function cleanupIfNewDay() {
  const today = new Date().toISOString().split("T")[0];
  if (lastCleanupDate !== today) {
    notifiedAppointments.clear();
    lastCleanupDate = today;
  }
}

/**
 * Obtiene las citas de mañana con sus datos de cliente y tipos de trabajo
 */
async function getTomorrowAppointmentsWithDetails() {
  const database = await getDb();
  if (!database) return [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfDay = new Date(tomorrow);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(tomorrow);
  endOfDay.setHours(23, 59, 59, 999);

  // Obtener citas de mañana que no estén canceladas
  const appointmentsList = await database
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.scheduledDate, startOfDay),
        lte(appointments.scheduledDate, endOfDay),
        inArray(appointments.status, ["pendiente", "confirmada"])
      )
    );

  // Para cada cita, obtener cliente y tipos de trabajo
  const results = [];
  for (const appt of appointmentsList) {
    const client = await db.getClientById(appt.clientId);
    if (!client || !client.whatsappPhone) continue;

    const workTypes = await database
      .select()
      .from(appointmentWorkTypes)
      .where(eq(appointmentWorkTypes.appointmentId, appt.id));

    results.push({
      appointment: appt,
      client,
      workTypes: workTypes.map((wt) => wt.workType),
    });
  }

  return results;
}

/**
 * Envía recordatorios de citas de mañana por WhatsApp
 * Solo envía 1 WhatsApp por cita (la primera vez que se ejecuta en el día)
 */
export async function sendAppointmentReminders(): Promise<{
  checked: number;
  sent: number;
  errors: number;
}> {
  let checked = 0;
  let sent = 0;
  let errors = 0;

  try {
    cleanupIfNewDay();

    if (!whatsappCloud.isWhatsAppCloudConfigured()) {
      console.log("[AppointmentReminder] WhatsApp Cloud API no configurado, saltando");
      return { checked: 0, sent: 0, errors: 0 };
    }

    const tomorrowAppointments = await getTomorrowAppointmentsWithDetails();
    checked = tomorrowAppointments.length;

    console.log(
      `[AppointmentReminder] Encontradas ${checked} citas para mañana`
    );

    for (const { appointment, client, workTypes } of tomorrowAppointments) {
      // Solo enviar WhatsApp 1 vez por cita
      if (notifiedAppointments.has(appointment.id)) {
        continue;
      }

      try {
        const workType = workTypes[0] || "cocina";
        const result = await whatsappCloud.sendAppointmentReminder(
          client.whatsappPhone,
          client.name,
          appointment.scheduledDate || new Date(),
          workType
        );

        if (result.success) {
          notifiedAppointments.add(appointment.id);
          sent++;
          console.log(
            `[AppointmentReminder] WhatsApp enviado a ${client.name} (${client.whatsappPhone}) para cita ${appointment.id}`
          );
        } else {
          console.warn(
            `[AppointmentReminder] Error enviando a ${client.name}: ${result.error}`
          );
          errors++;
        }
      } catch (error) {
        console.error(
          `[AppointmentReminder] Error procesando cita ${appointment.id}:`,
          error
        );
        errors++;
      }
    }
  } catch (error) {
    console.error("[AppointmentReminder] Error general:", error);
  }

  return { checked, sent, errors };
}

/**
 * Programa el servicio de recordatorios de citas
 * Verifica cada hora, envía a las 8am y 12pm
 */
export function startAppointmentReminderService(): void {
  // Verificar cada hora
  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();

    // Ejecutar a las 7pm (recordar citas del día siguiente)
    if (hour === 19) {
      console.log(
        `[AppointmentReminder] Ejecutando verificación de citas a las ${hour}:00`
      );
      const result = await sendAppointmentReminders();
      console.log(
        `[AppointmentReminder] Resultado: ${result.checked} revisadas, ${result.sent} enviadas, ${result.errors} errores`
      );
    }
  }, 60 * 60 * 1000);

  // Verificación inicial si el servidor inicia cerca de las 7pm
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 19 && hour <= 20) {
    setTimeout(async () => {
      console.log("[AppointmentReminder] Verificación inicial de citas");
      const result = await sendAppointmentReminders();
      console.log(
        `[AppointmentReminder] Resultado inicial: ${result.checked} revisadas, ${result.sent} enviadas, ${result.errors} errores`
      );
    }, 45000); // 45 segundos después del inicio
  }

  console.log(
    "[AppointmentReminder] Servicio de recordatorios de citas programado (7pm)"
  );
}
