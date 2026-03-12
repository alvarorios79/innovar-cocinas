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


export const hardwareCatalogRouter = router({
    list: protectedProcedure
      .input(z.object({
        category: z.enum(["cocinas", "closets", "puertas"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getHardwareCatalog(input?.category);
      }),

    create: protectedProcedure
      .input(z.object({
        category: z.enum(["cocinas", "closets", "puertas"]),
        name: z.string().min(1),
        description: z.string().optional(),
        options: z.string().optional(),
        price: z.number().optional(),
        photoUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden gestionar el catálogo" });
        }
        const id = await db.createHardwareItem({
          ...input,
          price: input.price !== undefined ? input.price.toString() : undefined,
        } as any);
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        options: z.string().optional(),
        price: z.number().optional(),
        photoUrl: z.string().optional(),
        sortOrder: z.number().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden gestionar el catálogo" });
        }
        const { id, active, price, ...rest } = input;
        await db.updateHardwareItem(id, {
          ...rest,
          ...(price !== undefined ? { price: price.toString() } : {}),
          ...(active !== undefined ? { active: active ? 1 : 0 } : {}),
        } as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden gestionar el catálogo" });
        }
        await db.deleteHardwareItem(input.id);
        return { success: true };
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        hardwareId: z.number(),
        photoData: z.string(), // base64
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden subir fotos" });
        }
        
        // Extraer datos base64
        const matches = input.photoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de imagen inválido" });
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        
        // Generar nombre único
        const ext = input.fileName.split(".").pop() || "jpg";
        const uniqueName = `hardware/${input.hardwareId}-${Date.now()}.${ext}`;
        
        // Subir a S3
        const { storagePut } = await import("../storage");
        const { url } = await storagePut(uniqueName, buffer, contentType);
        
        // Actualizar en DB
        await db.updateHardwareItem(input.hardwareId, { photoUrl: url });
        
        return { success: true, url };
      }),
});

