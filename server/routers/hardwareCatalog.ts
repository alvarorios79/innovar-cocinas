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

    initializeCatalog: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden inicializar el catálogo" });
        }

        const existing = await db.getHardwareCatalog();
        if (existing.length > 0) {
          return { success: true, message: `El catálogo ya tiene ${existing.length} items. Usa el panel para editar.`, created: 0 };
        }

        const items = [
          // ── COCINAS — Adicionales (precio adicional sobre el base) ──
          { category: "cocinas" as const, name: "Herraje Alacena",              description: "Sistema abatible para puertas de alacena. Precio adicional.",         options: "Cierre lento,Push,Estándar", price: "500000",   sortOrder: 1  },
          { category: "cocinas" as const, name: "Herraje Esquinero Giratorio",  description: "Sistema giratorio 360° para esquinas en L o U. Precio adicional.",    options: null,                         price: "500000",   sortOrder: 2  },
          { category: "cocinas" as const, name: "Bisagras Acero Inoxidable",    description: "Bisagras premium inoxidables con cierre lento. Precio adicional.",     options: null,                         price: "500000",   sortOrder: 3  },
          { category: "cocinas" as const, name: "Basurero Integrado Manual",    description: "Basurero empotrado extracción manual. Precio adicional.",              options: null,                         price: "500000",   sortOrder: 4  },
          { category: "cocinas" as const, name: "Basurero Integrado Automático",description: "Basurero empotrado extracción motorizada. Precio adicional.",          options: null,                         price: "800000",   sortOrder: 5  },
          { category: "cocinas" as const, name: "Botellero",                    description: "Módulo organizador de botellas extraíble. Precio adicional.",          options: null,                         price: "500000",   sortOrder: 6  },
          // ── COCINAS — Informativos (incluidos en precio base, $0) ──
          { category: "cocinas" as const, name: "Bisagras Estándar",            description: "Incluido en precio base de cocina.",                                   options: "Cromado,Negro",              price: "0",        sortOrder: 10 },
          { category: "cocinas" as const, name: "Bisagras Cierre Lento",        description: "Incluido en precio base de cocina.",                                   options: "Cromado,Negro",              price: "0",        sortOrder: 11 },
          { category: "cocinas" as const, name: "Rieles Cajón Sencillo",        description: "Incluido en precio base. Capacidad 15-20 kg.",                        options: "Cromado,Negro",              price: "0",        sortOrder: 12 },
          { category: "cocinas" as const, name: "Rieles Cajón Peso Medio",      description: "Incluido en precio base. Capacidad 30-40 kg.",                        options: "Cromado,Negro",              price: "0",        sortOrder: 13 },
          { category: "cocinas" as const, name: "Rieles Cajón Peso Alto",       description: "Incluido en precio base. Capacidad 50-60 kg.",                        options: "Cromado,Negro",              price: "0",        sortOrder: 14 },
          { category: "cocinas" as const, name: "Platero Inoxidable",           description: "Incluido en precio base. Acero inoxidable 304.",                      options: null,                         price: "0",        sortOrder: 15 },
          { category: "cocinas" as const, name: "Pistones a Gas",               description: "Incluido en precio base. Para puertas elevables.",                    options: null,                         price: "0",        sortOrder: 16 },
          { category: "cocinas" as const, name: "Herraje Puerta Partida",       description: "Incluido en precio base. Abatible + corredera.",                      options: null,                         price: "0",        sortOrder: 17 },
          { category: "cocinas" as const, name: "Patas Zócalo",                 description: "Incluido en precio base. Aluminio anodizado ajustable.",               options: "Cromado,Negro",              price: "0",        sortOrder: 18 },
          { category: "cocinas" as const, name: "Especiero Extraíble",          description: "Incluido en precio base. Para mueble superior.",                      options: null,                         price: "0",        sortOrder: 19 },
          // ── CLOSETS ──
          { category: "closets" as const, name: "Bisagras Estándar",            description: "Para puertas abatibles de closet.",                                   options: "Cromada,Negra",              price: "500000",   sortOrder: 1  },
          { category: "closets" as const, name: "Bisagras Cierre Lento",        description: "Cierre suave para puertas de closet.",                                options: "Cromada,Negra",              price: "500000",   sortOrder: 2  },
          { category: "closets" as const, name: "Bisagras Acero Inoxidable",    description: "Bisagras premium inoxidables.",                                       options: null,                         price: "500000",   sortOrder: 3  },
          { category: "closets" as const, name: "Rieles Cajón Sencillo",        description: "Capacidad 15-20 kg.",                                                  options: "Cromado,Negro",              price: "500000",   sortOrder: 4  },
          { category: "closets" as const, name: "Rieles Cajón Peso Medio",      description: "Capacidad 30-40 kg. Con cierre lento o push.",                        options: "Cierre lento,Push,Estándar", price: "650000",   sortOrder: 5  },
          { category: "closets" as const, name: "Rieles Cajón Peso Alto",       description: "Capacidad 50-60 kg. Alta durabilidad.",                               options: "Cierre lento,Push",          price: "800000",   sortOrder: 6  },
          { category: "closets" as const, name: "Tubo de Colgar",               description: "Acero cromado o negro. Diámetro 25-30 mm.",                          options: "Cromado,Negro",              price: "500000",   sortOrder: 7  },
          { category: "closets" as const, name: "Sistema Correderas",           description: "Puertas correderas de aluminio. Hasta 2.40 m de altura.",             options: "Cromado,Negro,Gama alta",    price: "500000",   sortOrder: 8  },
          { category: "closets" as const, name: "Manijas",                      description: "Para puertas y cajones de closet.",                                    options: "Cromada,Negra",              price: "500000",   sortOrder: 9  },
          { category: "closets" as const, name: "Pantaloneros",                 description: "Extraíble. Capacidad 10-15 pantalones.",                              options: null,                         price: "500000",   sortOrder: 10 },
          { category: "closets" as const, name: "Colgadero Elevador",           description: "Elevador manual o motorizado para máximo aprovechamiento.",           options: "Manual,Motorizado",          price: "500000",   sortOrder: 11 },
          // ── PUERTAS ──
          { category: "puertas" as const, name: "Bisagras Estándar",            description: "3 bisagras por puerta estándar.",                                     options: "Cromada,Negra",              price: "500000",   sortOrder: 1  },
          { category: "puertas" as const, name: "Bisagras Cierre Lento",        description: "Bisagras con amortiguación para cierre suave.",                       options: "Cromada,Negra",              price: "500000",   sortOrder: 2  },
          { category: "puertas" as const, name: "Bisagras Acero Inoxidable",    description: "Bisagras premium inoxidables.",                                       options: null,                         price: "500000",   sortOrder: 3  },
          { category: "puertas" as const, name: "Chapa Gama Alta",              description: "Acero inoxidable con seguridad alta.",                                 options: "Cromada,Negra",              price: "500000",   sortOrder: 4  },
          { category: "puertas" as const, name: "Topes de Puerta",              description: "Protege paredes. Tipo piso o pared.",                                 options: "Piso,Pared",                 price: "500000",   sortOrder: 5  },
        ];

        let created = 0;
        for (const item of items) {
          await db.createHardwareItem(item as any);
          created++;
        }

        return { success: true, message: `Catálogo inicializado con ${created} herrajes.`, created };
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

