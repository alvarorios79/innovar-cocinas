/**
 * Servicio de notificaciones WhatsApp para el equipo de INNOVAR
 * Envía recordatorios y alertas al equipo por WhatsApp Cloud API
 * 
 * Frecuencias:
 * - Recordatorios de proyecto al equipo: 2 veces/día (8am y 12pm), 1 WhatsApp por recordatorio
 * - Recordatorios de tareas al equipo: 2 veces/día (8am y 12pm), 1 WhatsApp por tarea
 * - Cambios pendientes >48h: 1 vez/día (8am) por WhatsApp
 * - Cumpleaños: 1 vez/día (8am) por WhatsApp
 */

import * as db from "./db";
import * as whatsappCloud from "./whatsapp-cloud";
import { REMINDER_CONFIG, type ReminderType } from "./reminders-service";

// ============ CONTROL DE ENVÍO ÚNICO ============

// Registro de notificaciones ya enviadas por WhatsApp hoy
const sentWhatsAppNotifications = {
  projectReminders: new Set<string>(), // "projectId-userId"
  taskReminders: new Set<number>(), // taskId
  overdueChanges: new Set<number>(), // projectId
  birthdays: new Set<number>(), // userId
};

let lastCleanupDate: string | null = null;

/**
 * Limpia los registros al cambiar de día
 */
function cleanupIfNewDay() {
  const today = new Date().toISOString().split("T")[0];
  if (lastCleanupDate !== today) {
    sentWhatsAppNotifications.projectReminders.clear();
    sentWhatsAppNotifications.taskReminders.clear();
    sentWhatsAppNotifications.overdueChanges.clear();
    sentWhatsAppNotifications.birthdays.clear();
    lastCleanupDate = today;
  }
}

/**
 * Obtiene los miembros del equipo con teléfono registrado
 */
async function getTeamMembersWithPhone() {
  const allUsers = await db.getAllUsers();
  return allUsers.filter(
    (u) => u.phone && u.role !== "user" // Solo miembros del equipo (no clientes)
  );
}

/**
 * Obtiene un usuario por ID con su teléfono
 */
async function getUserWithPhone(userId: number) {
  const user = await db.getUserById(userId);
  if (!user || !user.phone) return null;
  return user;
}

// ============ RECORDATORIOS DE PROYECTO AL EQUIPO ============

/**
 * Envía recordatorios de proyecto pendientes al equipo por WhatsApp
 * Solo envía 1 WhatsApp por recordatorio por día
 */
export async function sendProjectRemindersToTeam(): Promise<{
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
      return { checked: 0, sent: 0, errors: 0 };
    }

    const pendingReminders = await db.getPendingReminders();
    checked = pendingReminders.length;

    for (const reminder of pendingReminders) {
      const key = `${reminder.projectId}-${reminder.assignedTo}`;

      // Solo enviar 1 WhatsApp por recordatorio por día
      if (sentWhatsAppNotifications.projectReminders.has(key)) {
        continue;
      }

      const user = await getUserWithPhone(reminder.assignedTo);
      if (!user) continue;

      const project = await db.getProjectById(reminder.projectId);
      const projectName = project?.name || "Proyecto";
      const reminderConfig = REMINDER_CONFIG[reminder.type as ReminderType];
      const title = reminderConfig?.title || "Recordatorio";

      const message =
        `📋 *Recordatorio INNOVAR*\n\n` +
        `Hola ${user.name?.split(" ")[0] || "Equipo"},\n\n` +
        `*${title}*\n` +
        `📁 Proyecto: *${projectName}*\n\n` +
        `${reminder.message || "Tienes un recordatorio pendiente."}\n\n` +
        `Por favor revisa la plataforma para más detalles.`;

      try {
        const result = await whatsappCloud.sendTextMessage(user.phone!, message);
        if (result.success) {
          sentWhatsAppNotifications.projectReminders.add(key);
          sent++;
          console.log(
            `[TeamWhatsApp] Recordatorio proyecto enviado a ${user.name} (${user.phone})`
          );
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
        console.error(
          `[TeamWhatsApp] Error enviando recordatorio proyecto a ${user.name}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[TeamWhatsApp] Error en recordatorios de proyecto:", error);
  }

  return { checked, sent, errors };
}

// ============ RECORDATORIOS DE TAREAS AL EQUIPO ============

/**
 * Envía recordatorios de tareas próximas a vencer al equipo por WhatsApp
 * Solo envía 1 WhatsApp por tarea por día
 */
export async function sendTaskRemindersToTeam(): Promise<{
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
      return { checked: 0, sent: 0, errors: 0 };
    }

    const allTasks = await db.getAllTasks();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Filtrar tareas próximas a vencer o vencidas (hasta 3 días)
    const tasksToRemind = allTasks.filter((task) => {
      if (task.status === "completada" || !task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return dueDate >= threeDaysAgo && dueDate <= tomorrow;
    });

    checked = tasksToRemind.length;

    for (const task of tasksToRemind) {
      // Solo enviar 1 WhatsApp por tarea por día
      if (sentWhatsAppNotifications.taskReminders.has(task.id)) {
        continue;
      }

      const user = await getUserWithPhone(task.assignedTo);
      if (!user) continue;

      const dueDate = new Date(task.dueDate!);
      const isOverdue = dueDate < now;
      const isToday = dueDate.toDateString() === now.toDateString();

      let urgencyText = "";
      let emoji = "";
      if (isOverdue) {
        urgencyText = "VENCIDA";
        emoji = "🚨";
      } else if (isToday) {
        urgencyText = "Vence HOY";
        emoji = "⚠️";
      } else {
        urgencyText = "Vence MAÑANA";
        emoji = "📅";
      }

      const message =
        `${emoji} *Recordatorio de Tarea - INNOVAR*\n\n` +
        `Hola ${user.name?.split(" ")[0] || "Equipo"},\n\n` +
        `*${urgencyText}*\n` +
        `📝 Tarea: *${task.title}*\n` +
        `📅 Fecha límite: ${dueDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}\n` +
        `${task.priority === "alta" ? "🔴 Prioridad: Alta\n" : ""}` +
        `\nPor favor revisa la plataforma para más detalles.`;

      try {
        const result = await whatsappCloud.sendTextMessage(user.phone!, message);
        if (result.success) {
          sentWhatsAppNotifications.taskReminders.add(task.id);
          sent++;
          console.log(
            `[TeamWhatsApp] Recordatorio tarea enviado a ${user.name} (${user.phone})`
          );
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
        console.error(
          `[TeamWhatsApp] Error enviando recordatorio tarea a ${user.name}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[TeamWhatsApp] Error en recordatorios de tareas:", error);
  }

  return { checked, sent, errors };
}

// ============ CAMBIOS PENDIENTES >48H AL EQUIPO ============

/**
 * Envía alertas de cambios pendientes >48h a admins por WhatsApp
 * Solo envía 1 WhatsApp por proyecto por día
 */
export async function sendOverdueChangesToTeam(): Promise<{
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
      return { checked: 0, sent: 0, errors: 0 };
    }

    const allProjects = await db.getAllProjects();
    const projectsWithChanges = allProjects.filter(
      (p) => p.status === "en_diseno" && p.changesRequestedAt
    );

    checked = projectsWithChanges.length;
    const OVERDUE_THRESHOLD = 48 * 60 * 60 * 1000;
    const now = Date.now();

    for (const project of projectsWithChanges) {
      const changesDate = new Date(
        project.changesRequestedAt as Date
      ).getTime();
      const timeSinceChanges = now - changesDate;

      if (timeSinceChanges <= OVERDUE_THRESHOLD) continue;

      // Solo enviar 1 WhatsApp por proyecto por día
      if (sentWhatsAppNotifications.overdueChanges.has(project.id)) {
        continue;
      }

      const daysOverdue = Math.floor(
        timeSinceChanges / (24 * 60 * 60 * 1000)
      );

      // Obtener diseñador
      let designerName = "Sin asignar";
      if (project.designerId) {
        const designer = await db.getUserById(project.designerId);
        if (designer) designerName = designer.name || "Diseñador";
      }

      // Enviar a admins y super_admins con teléfono
      const admins = await db.getUsersByRole("admin");
      const superAdmins = await db.getUsersByRole("super_admin");
      const allAdmins = [...admins, ...superAdmins].filter((u) => u.phone);

      for (const admin of allAdmins) {
        const message =
          `⚠️ *ALERTA: Cambios Pendientes > 48h*\n\n` +
          `Hola ${admin.name?.split(" ")[0] || "Admin"},\n\n` +
          `El proyecto *${project.name}* lleva *${daysOverdue} día(s)* con cambios solicitados por el cliente sin atender.\n\n` +
          `👤 Diseñador: ${designerName}\n` +
          `📝 Cambios: ${project.clientApprovalNotes || "No especificados"}\n\n` +
          `Por favor hacer seguimiento urgente.`;

        try {
          const result = await whatsappCloud.sendTextMessage(
            admin.phone!,
            message
          );
          if (result.success) {
            sent++;
            console.log(
              `[TeamWhatsApp] Alerta cambios pendientes enviada a ${admin.name} (${admin.phone})`
            );
          } else {
            errors++;
          }
        } catch (error) {
          errors++;
        }
      }

      sentWhatsAppNotifications.overdueChanges.add(project.id);
    }
  } catch (error) {
    console.error("[TeamWhatsApp] Error en cambios pendientes:", error);
  }

  return { checked, sent, errors };
}

// ============ CUMPLEAÑOS POR WHATSAPP ============

/**
 * Envía felicitación de cumpleaños por WhatsApp al miembro del equipo
 * Solo envía 1 WhatsApp por usuario por día
 */
export async function sendBirthdayWhatsApp(): Promise<{
  sent: number;
  errors: number;
}> {
  let sent = 0;
  let errors = 0;

  try {
    cleanupIfNewDay();

    if (!whatsappCloud.isWhatsAppCloudConfigured()) {
      return { sent: 0, errors: 0 };
    }

    const allUsers = await db.getAllUsers();
    const today = new Date();

    const birthdayUsers = allUsers.filter((user) => {
      if (!user.birthDate || !user.phone) return false;
      const birth = new Date(user.birthDate);
      return (
        birth.getMonth() === today.getMonth() &&
        birth.getDate() === today.getDate()
      );
    });

    for (const user of birthdayUsers) {
      // Solo enviar 1 WhatsApp por usuario por día
      if (sentWhatsAppNotifications.birthdays.has(user.id)) {
        continue;
      }

      try {
        const result = await whatsappCloud.sendBirthdayGreeting(
          user.phone!,
          user.name?.split(" ")[0] || "Amigo"
        );
        if (result.success) {
          sentWhatsAppNotifications.birthdays.add(user.id);
          sent++;
          console.log(
            `[TeamWhatsApp] Cumpleaños WhatsApp enviado a ${user.name} (${user.phone})`
          );
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
        console.error(
          `[TeamWhatsApp] Error enviando cumpleaños a ${user.name}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[TeamWhatsApp] Error en cumpleaños:", error);
  }

  return { sent, errors };
}

// ============ SERVICIO CENTRAL ============

/**
 * Ejecuta todas las notificaciones WhatsApp del equipo
 */
async function runTeamNotifications(hour: number) {
  console.log(
    `[TeamWhatsApp] Ejecutando notificaciones del equipo a las ${hour}:00`
  );

  // 8am: Todo (proyecto, tareas, cambios pendientes, cumpleaños)
  // 12pm: Solo proyecto y tareas
  const results: Record<string, any> = {};

  // Recordatorios de proyecto (8am y 12pm)
  const projectResult = await sendProjectRemindersToTeam();
  results.proyectos = projectResult;

  // Recordatorios de tareas (8am y 12pm)
  const taskResult = await sendTaskRemindersToTeam();
  results.tareas = taskResult;

  if (hour === 8) {
    // Cambios pendientes >48h (solo 8am)
    const overdueResult = await sendOverdueChangesToTeam();
    results.cambiosPendientes = overdueResult;

    // Cumpleaños (solo 8am)
    const birthdayResult = await sendBirthdayWhatsApp();
    results.cumpleanos = birthdayResult;
  }

  console.log("[TeamWhatsApp] Resultados:", JSON.stringify(results));
  return results;
}

/**
 * Programa el servicio de notificaciones WhatsApp del equipo
 * Verifica cada hora, ejecuta a las 8am y 12pm
 */
export function startTeamWhatsAppService(): void {
  // Verificar cada hora
  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour === 8 || hour === 12) {
      await runTeamNotifications(hour);
    }
  }, 60 * 60 * 1000);

  // Verificación inicial si el servidor inicia entre 8am y 12pm
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 8 && hour <= 12) {
    setTimeout(async () => {
      console.log("[TeamWhatsApp] Verificación inicial");
      await runTeamNotifications(hour >= 12 ? 12 : 8);
    }, 60000); // 1 minuto después del inicio
  }

  console.log(
    "[TeamWhatsApp] Servicio de notificaciones WhatsApp del equipo programado (8am y 12pm)"
  );
}
