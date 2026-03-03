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


export const pdfRouter = router({
    // Generar reporte HTML del proyecto (para convertir a PDF en el cliente)
    generateProjectReport: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verificar que el usuario tenga acceso al proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar permisos: admin, super_admin, comercial, o cliente dueño del proyecto
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "comercial";
        const isWorker = ["disenador", "jefe_taller", "operario"].includes(ctx.user.role);
        let isOwner = false;
        
        if (!isAdmin && !isWorker) {
          const client = await db.getClientByUserId(ctx.user.id);
          isOwner = !!(client && client.id === project.clientId);
        }

        if (!isAdmin && !isWorker && !isOwner) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
        }

        const { generateProjectReportHTML } = await import("../pdf-generator");
        const html = await generateProjectReportHTML(input.projectId);

        return { html, projectName: project.name };
      }),
});

