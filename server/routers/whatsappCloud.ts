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


export const whatsappCloudRouter = router({
    // Verificar estado de conexión
    getStatus: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver la configuración de WhatsApp" });
        }
        
        const isConfigured = whatsappCloud.isWhatsAppCloudConfigured();
        
        if (!isConfigured) {
          return {
            configured: false,
            connected: false,
            message: "WhatsApp Cloud API no está configurado. Configure WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID.",
          };
        }
        
        const connectionStatus = await whatsappCloud.verifyConnection();
        
        return {
          configured: true,
          connected: connectionStatus.connected,
          phoneNumber: connectionStatus.phoneNumber,
          displayName: connectionStatus.displayName,
          error: connectionStatus.error,
        };
      }),

    // Enviar mensaje de prueba
    sendTestMessage: protectedProcedure
      .input(z.object({
        phone: z.string().min(10, "Número de teléfono inválido"),
        message: z.string().min(1, "El mensaje no puede estar vacío"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para enviar mensajes de prueba" });
        }
        
        const result = await whatsappCloud.sendTextMessage(input.phone, input.message);
        
        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        };
      }),
});

