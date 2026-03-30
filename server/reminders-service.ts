/**
 * Servicio de recordatorios automáticos para Ruta INNOVAR
 * Genera y gestiona recordatorios según el estado del proyecto
 */

import * as db from "./db";
import { addBusinessDays } from "./business-days";
import { generateProjectMessage, generateWhatsAppLink } from "./whatsapp-notifications";

// Tipos de recordatorio y sus configuraciones
export const REMINDER_CONFIG = {
  cotizacion_sin_respuesta: {
    businessDays: 2,
    targetRole: "admin", // Comercial/Admin
    title: "Cotización sin respuesta",
    getMessage: (projectName: string) => 
      `El cliente no ha respondido a la cotización del proyecto "${projectName}". Es momento de hacer seguimiento.`,
  },
  diseno_pendiente: {
    businessDays: 3,
    targetRole: "disenador",
    title: "Diseño pendiente de entrega",
    getMessage: (projectName: string) => 
      `El diseño del proyecto "${projectName}" debe ser entregado hoy. El cliente ya pagó el adelanto.`,
  },
  aprobacion_pendiente: {
    businessDays: 5,
    targetRole: "admin",
    title: "Diseño pendiente de aprobación",
    getMessage: (projectName: string) => 
      `El cliente no ha aprobado el diseño del proyecto "${projectName}" en 5 días. Hacer seguimiento.`,
  },
  produccion_retrasada: {
    businessDays: 20, // Si lleva más de 20 días en producción
    targetRole: "jefe_taller",
    title: "Producción posiblemente retrasada",
    getMessage: (projectName: string) => 
      `El proyecto "${projectName}" lleva más de 20 días en producción. Verificar estado.`,
  },
  instalacion_proxima: {
    businessDays: -3, // 3 días antes de la instalación
    targetRole: "jefe_taller",
    title: "Instalación próxima",
    getMessage: (projectName: string) => 
      `La instalación del proyecto "${projectName}" está programada para dentro de 3 días. Verificar que todo esté listo.`,
  },
} as const;

export type ReminderType = keyof typeof REMINDER_CONFIG;

/**
 * Crear recordatorio para un proyecto
 */
export async function createProjectReminder(
  projectId: number,
  type: ReminderType,
  assignedToId: number,
  dueDate: Date,
  customMessage?: string
): Promise<number> {
  const config = REMINDER_CONFIG[type];
  const project = await db.getProjectById(projectId);
  
  const message = customMessage || (project ? config.getMessage(project.name) : config.getMessage("Proyecto"));
  
  return db.createReminder({
    projectId,
    type,
    assignedTo: assignedToId,
    dueDate: dueDate instanceof Date ? dueDate.toISOString() : dueDate,
    message,
    status: "pendiente",
  });
}

/**
 * Crear recordatorios automáticos al cambiar estado del proyecto
 */
export async function createRemindersForStatusChange(
  projectId: number,
  newStatus: string,
  project: {
    name: string;
    createdBy: number;
    designerId?: number | null;
    clientId: number;
  }
): Promise<void> {
  // Cancelar recordatorios pendientes anteriores
  await db.cancelProjectReminders(projectId);
  
  const now = new Date();
  
  switch (newStatus) {
    case "cotizacion_enviada": {
      // Recordatorio en 2 días hábiles si no hay respuesta
      const dueDate = await addBusinessDays(now, 2);
      await createProjectReminder(
        projectId,
        "cotizacion_sin_respuesta",
        project.createdBy,
        dueDate
      );
      break;
    }
    
    case "adelanto_recibido": {
      // Recordatorio al diseñador: 3 días para entregar diseño
      if (project.designerId) {
        const dueDate = await addBusinessDays(now, 3);
        await createProjectReminder(
          projectId,
          "diseno_pendiente",
          project.designerId,
          dueDate
        );
      } else {
        // Si no hay diseñador asignado, notificar al admin
        const dueDate = await addBusinessDays(now, 3);
        await createProjectReminder(
          projectId,
          "diseno_pendiente",
          project.createdBy,
          dueDate,
          `El proyecto "${project.name}" necesita un diseñador asignado. El cliente ya pagó el adelanto.`
        );
      }
      break;
    }
    
    case "pendiente_render": {
      // Recordatorio en 5 días si el cliente no aprueba
      const dueDate = await addBusinessDays(now, 5);
      await createProjectReminder(
        projectId,
        "aprobacion_pendiente",
        project.createdBy,
        dueDate
      );
      break;
    }
    
    case "aprobacion_final": {
      // Recordatorio de producción en 20 días hábiles
      const jefeTaller = await getJefeTaller();
      if (jefeTaller) {
        const dueDate = await addBusinessDays(now, 20);
        await createProjectReminder(
          projectId,
          "produccion_retrasada",
          jefeTaller.id,
          dueDate
        );
      }
      break;
    }
    
    case "en_instalacion": {
      // Recordatorio 3 días antes de la instalación
      const projectData = await db.getProjectById(projectId);
      if (projectData?.scheduledInstallDate) {
        const installDate = new Date(projectData.scheduledInstallDate);
        const dueDate = new Date(installDate);
        dueDate.setDate(dueDate.getDate() - 3);
        
        const jefeTaller = await getJefeTaller();
        if (jefeTaller && dueDate > now) {
          await createProjectReminder(
            projectId,
            "instalacion_proxima",
            jefeTaller.id,
            dueDate
          );
        }
      }
      break;
    }
  }
}

/**
 * Obtener el jefe de taller (primer usuario con ese rol)
 */
async function getJefeTaller() {
  const users = await db.getUsersByRole("jefe_taller");
  return users[0] || null;
}

/**
 * Procesar recordatorios pendientes (para ejecutar periódicamente)
 */
export async function processPendingReminders(): Promise<{
  processed: number;
  notifications: Array<{
    userId: number;
    title: string;
    message: string;
    projectId: number;
  }>;
}> {
  const pendingReminders = await db.getPendingReminders();
  const notifications: Array<{
    userId: number;
    title: string;
    message: string;
    projectId: number;
  }> = [];
  
  for (const reminder of pendingReminders) {
    // Crear notificación en el sistema
    await db.createNotification({
      userId: reminder.assignedTo,
      title: REMINDER_CONFIG[reminder.type as ReminderType]?.title || "Recordatorio",
      body: reminder.message || "Tienes un recordatorio pendiente",
      type: "proyecto",
      referenceId: reminder.projectId,
      referenceType: "project",
    });
    
    // Marcar como enviado
    await db.updateReminderStatus(reminder.id, "enviado");
    
    notifications.push({
      userId: reminder.assignedTo,
      title: REMINDER_CONFIG[reminder.type as ReminderType]?.title || "Recordatorio",
      message: reminder.message || "",
    // @ts-ignore
      projectId: reminder.projectId,
    });
  }
  
  return {
    processed: pendingReminders.length,
    notifications,
  };
}

/**
 * Obtener recordatorios pendientes para un usuario
 */
export async function getUserPendingReminders(userId: number) {
  const reminders = await db.getRemindersByUserId(userId);
  return reminders.filter(r => r.status === "pendiente" || r.status === "enviado");
}

/**
 * Obtener resumen de recordatorios por proyecto
 */
export async function getProjectRemindersStatus(projectId: number) {
  const reminders = await db.getRemindersByProjectId(projectId);
  
  return {
    total: reminders.length,
    pending: reminders.filter(r => r.status === "pendiente").length,
    sent: reminders.filter(r => r.status === "enviado").length,
    completed: reminders.filter(r => r.status === "completado").length,
    reminders: reminders.map(r => ({
      id: r.id,
      type: r.type,
      status: r.status,
      dueDate: r.dueDate,
      message: r.message,
    })),
  };
}

/**
 * Marcar recordatorio como completado
 */
export async function completeReminder(reminderId: number): Promise<void> {
  await db.updateReminderStatus(reminderId, "completado");
}

/**
 * Generar mensaje de WhatsApp para recordatorio de seguimiento
 */
export function generateFollowUpWhatsAppMessage(
  clientName: string,
  clientPhone: string,
  projectName: string,
  reminderType: ReminderType
): { message: string; whatsappLink: string } {
  let message = "";
  
  switch (reminderType) {
    case "cotizacion_sin_respuesta":
      message = `¡Hola ${clientName}! 👋\n\n` +
        `Soy de INNOVAR Cocinas de Diseño. Te escribo para hacer seguimiento a la cotización que te enviamos para tu proyecto "${projectName}".\n\n` +
        `¿Tienes alguna pregunta o inquietud que podamos resolver?\n\n` +
        `Quedamos atentos a tu respuesta. 🏠✨`;
      break;
      
    case "aprobacion_pendiente":
      message = `¡Hola ${clientName}! 👋\n\n` +
        `Te escribo de INNOVAR Cocinas de Diseño. Queremos saber si has tenido oportunidad de revisar el diseño que te enviamos para tu proyecto "${projectName}".\n\n` +
        `Si tienes alguna modificación o comentario, con gusto lo ajustamos.\n\n` +
        `¡Quedamos atentos! 🎨`;
      break;
      
    default:
      message = `¡Hola ${clientName}! 👋\n\n` +
        `Te escribo de INNOVAR Cocinas de Diseño para hacer seguimiento a tu proyecto "${projectName}".\n\n` +
        `¿Cómo podemos ayudarte?`;
  }
  
  return {
    message,
    whatsappLink: generateWhatsAppLink(clientPhone, message),
  };
}
