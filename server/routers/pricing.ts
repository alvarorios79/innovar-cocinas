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


export const pricingRouter = router({
    // Obtener todos los precios configurables
    getAll: protectedProcedure.query(async ({ ctx }) => {
      // Solo super_admin puede ver la configuración de precios
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver la configuración de precios" });
      }
      return await db.getAllPricingConfig();
    }),

    // Obtener precios por categoría
    getByCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver la configuración de precios" });
        }
        return await db.getPricingByCategory(input.category);
      }),

    // Obtener precio por código (para uso interno en cálculos)
    getByCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const pricing = await db.getPricingByCode(input.code);
        return pricing ? { value: Number(pricing.value), unit: pricing.unit } : null;
      }),

    // Obtener todos los precios para cálculos (público para el sistema de cotizaciones)
    getAllForCalculations: publicProcedure.query(async () => {
      const allPricing = await db.getAllPricingConfig();
      // Convertir a un objeto indexado por código para fácil acceso
      const pricingMap: Record<string, { value: number; unit: string | null }> = {};
      for (const p of allPricing) {
        pricingMap[p.code] = { value: Number(p.value), unit: p.unit };
      }
      return pricingMap;
    }),

    // Actualizar un precio
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        value: z.number().min(0, "El valor debe ser mayor o igual a 0"),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo el super administrador puede modificar precios" });
        }
        await db.updatePricingConfig(input.id, input.value, ctx.user.id, input.reason);
        return { success: true };
      }),

    // Crear nuevo precio
    create: protectedProcedure
      .input(z.object({
        category: z.string(),
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        value: z.number().min(0),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo el super administrador puede crear precios" });
        }
        const id = await db.createPricingConfig(input);
        return { success: true, id };
      }),

    // Obtener historial de cambios de un precio
    getHistory: protectedProcedure
      .input(z.object({ pricingConfigId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el historial de precios" });
        }
        return await db.getPricingHistory(input.pricingConfigId);
      }),

    // Obtener historial general de cambios
    getAllHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el historial de precios" });
        }
        return await db.getAllPricingHistory(input.limit || 50);
      }),

    // Eliminar precio (soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo el super administrador puede eliminar precios" });
        }
        await db.deletePricingConfig(input.id);
        return { success: true };
      }),
});

