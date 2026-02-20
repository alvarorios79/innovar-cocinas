// @ts-nocheck
import webpush from "web-push";
import * as db from "./db";

// VAPID keys cargadas desde variables de entorno (obligatorio)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("[Push] VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY son obligatorias. Notificaciones push deshabilitadas.");
}

// Configurar web-push solo si las keys están disponibles
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:info@innovarcocinas.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

function isPushEnabled(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
}

// Enviar notificación push a un usuario específico
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<{ success: number; failed: number }> {
  if (!isPushEnabled()) {
    return { success: 0, failed: 0 };
  }
  const subscriptions = await db.getPushSubscriptionsByUserId(userId);
  
  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify({
          ...payload,
          icon: payload.icon || "/icon-192.png",
          badge: payload.badge || "/icon-192.png",
        })
      );
      success++;
    } catch (error: any) {
      console.error(`Error sending push to subscription ${sub.id}:`, error);
      
      // Si la suscripción ya no es válida, eliminarla
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.deletePushSubscription(sub.endpoint);
      }
      failed++;
    }
  }

  return { success, failed };
}

// Enviar notificación push a múltiples usuarios
export async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<{ success: number; failed: number }> {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  return { success: totalSuccess, failed: totalFailed };
}

// Enviar notificación push a todos los usuarios con un rol específico
export async function sendPushToRole(role: string, payload: PushPayload): Promise<{ success: number; failed: number }> {
  const users = await db.getUsersByRole(role);
  const userIds = users.map(u => u.id);
  return sendPushToUsers(userIds, payload);
}

// Crear notificación en la base de datos y enviar push
export async function createAndSendNotification(
  userId: number,
  notification: {
    title: string;
    body: string;
    type: "proyecto" | "tarea" | "cita" | "cotizacion" | "sistema";
    referenceId?: number;
    referenceType?: string;
    url?: string;
  }
): Promise<number> {
  // Crear notificación en la base de datos
  const notificationId = await db.createNotification({
    userId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    referenceId: notification.referenceId,
    referenceType: notification.referenceType,
    read: false,
    sentPush: false,
  });

  // Enviar push
  try {
    const result = await sendPushToUser(userId, {
      title: notification.title,
      body: notification.body,
      tag: `${notification.type}-${notification.referenceId || notificationId}`,
      data: {
        url: notification.url || "/",
        notificationId,
        type: notification.type,
        referenceId: notification.referenceId,
      },
    });

    if (result.success > 0) {
      await db.updateNotificationPushSent(notificationId);
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }

  return notificationId;
}

// Notificaciones predefinidas para eventos comunes
export const NotificationTemplates = {
  // Proyecto
  projectCreated: (projectName: string, projectId: number) => ({
    title: "Nuevo Proyecto Creado",
    body: `Se ha creado el proyecto "${projectName}"`,
    type: "proyecto" as const,
    referenceId: projectId,
    referenceType: "project",
    url: `/proyectos?id=${projectId}`,
  }),

  projectStatusChanged: (projectName: string, newStatus: string, projectId: number) => ({
    title: "Estado de Proyecto Actualizado",
    body: `El proyecto "${projectName}" cambió a: ${newStatus}`,
    type: "proyecto" as const,
    referenceId: projectId,
    referenceType: "project",
    url: `/proyectos?id=${projectId}`,
  }),

  designReadyForApproval: (projectName: string, projectId: number) => ({
    title: "Diseño Listo para Aprobar",
    body: `El diseño 3D de "${projectName}" está listo para tu aprobación`,
    type: "proyecto" as const,
    referenceId: projectId,
    referenceType: "project",
    url: `/portal`,
  }),

  designApproved: (projectName: string, projectId: number) => ({
    title: "Diseño Aprobado",
    body: `El cliente aprobó el diseño de "${projectName}". ¡A producción!`,
    type: "proyecto" as const,
    referenceId: projectId,
    referenceType: "project",
    url: `/proyectos?id=${projectId}`,
  }),

  // Tareas
  taskAssigned: (taskTitle: string, taskId: number, projectId?: number) => ({
    title: "Nueva Tarea Asignada",
    body: `Se te ha asignado: "${taskTitle}"`,
    type: "tarea" as const,
    referenceId: taskId,
    referenceType: "task",
    url: `/tareas`,
  }),

  taskCompleted: (taskTitle: string, taskId: number) => ({
    title: "Tarea Completada",
    body: `La tarea "${taskTitle}" ha sido completada`,
    type: "tarea" as const,
    referenceId: taskId,
    referenceType: "task",
    url: `/tareas`,
  }),

  // Citas
  appointmentConfirmed: (date: string, appointmentId: number) => ({
    title: "Cita Confirmada",
    body: `Tu cita ha sido confirmada para el ${date}`,
    type: "cita" as const,
    referenceId: appointmentId,
    referenceType: "appointment",
    url: `/portal`,
  }),

  appointmentReminder: (date: string, appointmentId: number) => ({
    title: "Recordatorio de Cita",
    body: `Tienes una cita mañana ${date}`,
    type: "cita" as const,
    referenceId: appointmentId,
    referenceType: "appointment",
    url: `/portal`,
  }),

  // Cotizaciones
  quotationCreated: (clientName: string, quotationId: number) => ({
    title: "Nueva Cotización",
    body: `Se ha creado una cotización para ${clientName}`,
    type: "cotizacion" as const,
    referenceId: quotationId,
    referenceType: "quotation",
    url: `/portal`,
  }),
};
