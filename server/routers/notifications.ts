import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { systemRouter } from "../_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { withTransaction } from "../db";
import * as whatsapp from "../whatsapp";
import { TRPCError } from "@trpc/server";
import { getAvailableTimeSlots, isTimeSlotAvailable, APPOINTMENT_CONFIG } from "../availability";
import { hashPassword, validatePasswordStrength, authenticateWithPassword } from "../password-auth";
import { prepareWhatsAppNotification, generateTeamWhatsAppLink } from "../whatsapp-notifications";
import { createRemindersForStatusChange } from "../reminders-service";
import * as whatsappCloud from "../whatsapp-cloud";
import { addBusinessDays, calculateEstimatedDeliveryDate } from "../business-days";
import { sanitizeText, sanitizeHtml, sanitizeForEmail, sanitizePhone, sanitizeEmail } from "../sanitize";


export const notificationsRouter = router({
    // Obtener clave pública VAPID para suscripciones push
    getVapidPublicKey: publicProcedure
      .query(async () => {
        const { getVapidPublicKey } = await import("../push-notifications");
        return { publicKey: getVapidPublicKey() };
      }),

    // Registrar suscripción push
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subscriptionId = await db.createPushSubscription({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        });
        return { success: true, subscriptionId };
      }),

    // Cancelar suscripción push
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await db.deletePushSubscription(input.endpoint);
        return { success: true };
      }),

    // Obtener mis notificaciones
    getMyNotifications: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getNotificationsByUserId(ctx.user.id, input?.limit || 50);
      }),

    // Obtener contador de no leídas
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await db.getUnreadNotificationsCount(ctx.user.id);
        return { count };
      }),

    // Marcar notificación como leída
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    // Marcar todas como leídas
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),

    // Eliminar notificación
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteNotification(input.id);
        return { success: true };
      }),

    // Enviar notificación de prueba (solo admin)
    sendTest: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden enviar notificaciones de prueba" });
        }

        const { createAndSendNotification } = await import("../push-notifications");
        await createAndSendNotification(ctx.user.id, {
          title: "Notificación de Prueba",
          body: "¡Las notificaciones push están funcionando correctamente!",
          type: "sistema",
          url: "/",
        });

        return { success: true };
      }),
});

export const remindersRouter = router({
    // Obtener mis recordatorios
    getMyReminders: protectedProcedure
      .query(async ({ ctx }) => {
        const reminders = await db.getRemindersByUserId(ctx.user.id);
        
        // Enriquecer con información del proyecto y cliente
        const enrichedReminders = await Promise.all(
          reminders.map(async (reminder) => {
            const project = await db.getProjectById(reminder.projectId);
            let client = null;
            if (project?.clientId) {
              client = await db.getClientById(project.clientId);
            }
            return {
              ...reminder,
              project: project ? {
                id: project.id,
                name: project.name,
                status: project.status,
                client: client ? {
                  id: client.id,
                  name: client.name,
                  whatsappPhone: client.whatsappPhone,
                } : null,
              } : null,
            };
          })
        );
        
        return enrichedReminders;
      }),

    // Obtener recordatorios por proyecto
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRemindersByProjectId(input.projectId);
      }),

    // Marcar recordatorio como completado
    complete: protectedProcedure
      .input(z.object({ reminderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el recordatorio pertenece al usuario o es admin
        const reminders = await db.getRemindersByUserId(ctx.user.id);
        const reminder = reminders.find(r => r.id === input.reminderId);
        
        if (!reminder && ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para completar este recordatorio" 
          });
        }
        
        await db.updateReminderStatus(input.reminderId, "completado");
        return { success: true };
      }),

    // Cancelar recordatorio
    cancel: protectedProcedure
      .input(z.object({ reminderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo administradores pueden cancelar recordatorios" 
          });
        }
        
        await db.updateReminderStatus(input.reminderId, "cancelado");
        return { success: true };
      }),

    // Obtener resumen de recordatorios (para dashboard)
    getSummary: protectedProcedure
      .query(async ({ ctx }) => {
        const reminders = await db.getRemindersByUserId(ctx.user.id);
        const now = new Date();
        
        const pending = reminders.filter(r => r.status === "pendiente" || r.status === "enviado");
        const overdue = pending.filter(r => new Date(r.dueDate) <= now);
        const upcoming = pending.filter(r => new Date(r.dueDate) > now);
        
        return {
          total: pending.length,
          overdue: overdue.length,
          upcoming: upcoming.length,
          byType: {
            cotizacion_sin_respuesta: pending.filter(r => r.type === "cotizacion_sin_respuesta").length,
            diseno_pendiente: pending.filter(r => r.type === "diseno_pendiente").length,
            aprobacion_pendiente: pending.filter(r => r.type === "aprobacion_pendiente").length,
            produccion_retrasada: pending.filter(r => r.type === "produccion_retrasada").length,
            instalacion_proxima: pending.filter(r => r.type === "instalacion_proxima").length,
          },
        };
      }),
});

