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
      // admin y super_admin pueden ver la configuración de precios
      if (!["super_admin", "admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver la configuración de precios" });
      }
      return await db.getAllPricingConfig();
    }),

    // Obtener precios por categoría
    getByCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!["super_admin", "admin"].includes(ctx.user.role)) {
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
        descriptionTemplate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["super_admin", "admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin o super_admin puede modificar precios" });
        }
        await db.updatePricingConfig(input.id, input.value, ctx.user.id, input.reason, input.descriptionTemplate);
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
        if (!["super_admin", "admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin o super_admin puede crear precios" });
        }
        const id = await db.createPricingConfig(input);
        return { success: true, id };
      }),

    // Obtener historial de cambios de un precio
    getHistory: protectedProcedure
      .input(z.object({ pricingConfigId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!["super_admin", "admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el historial de precios" });
        }
        return await db.getPricingHistory(input.pricingConfigId);
      }),

    // Obtener historial general de cambios
    getAllHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (!["super_admin", "admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el historial de precios" });
        }
        return await db.getAllPricingHistory(input.limit || 50);
      }),

    // Eliminar precio (soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!["super_admin", "admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin o super_admin puede eliminar precios" });
        }
        await db.deletePricingConfig(input.id);
        return { success: true };
      }),

    // Inicializar / re-sembrar la biblioteca de precios desde el catálogo base
    seedDefaults: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!["super_admin", "admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin o super_admin puede inicializar precios" });
        }

        const CATALOG = [
          // Cocina Base
          // Cocinas completas (inf+sup incluido) — precio total por ml
          { category: "cocina_base", code: "COCINA_ML_ESTANDAR",    name: "Cocina Estándar (inf+sup/ml)",      value: 900000,  unit: "ml",      sortOrder: 1, description: "Precio total por ml incluyendo mueble inferior y superior." },
          { category: "cocina_base", code: "COCINA_ML_PREMIUM",     name: "Cocina Premium (inf+sup/ml)",       value: 1000000, unit: "ml",      sortOrder: 2, description: "Precio total por ml incluyendo mueble inferior y superior." },
          { category: "cocina_base", code: "COCINA_ML_DELUXE",      name: "Cocina Deluxe (inf+sup/ml)",        value: 1100000, unit: "ml",      sortOrder: 3, description: "Precio total por ml incluyendo mueble inferior y superior." },
          // Muebles sueltos (cliente que solo requiere uno de los dos)
          { category: "cocina_base", code: "MUEBLE_INFERIOR_ML",    name: "Solo Mueble Inferior (por ml)",     value: 900000,  unit: "ml",      sortOrder: 4, description: "Para clientes que ya tienen superiores y solo necesitan inferiores." },
          { category: "cocina_base", code: "MUEBLE_SUPERIOR_ML",    name: "Solo Mueble Superior (por ml)",     value: 900000,  unit: "ml",      sortOrder: 5, description: "Para clientes que ya tienen inferiores y solo necesitan superiores." },
          { category: "cocina_base", code: "COCINA_ML_FRENTE_PLL",  name: "Frente / PLL (solo un módulo/ml)", value: 900000,  unit: "ml",      sortOrder: 6 },
          { category: "cocina_base", code: "TRANSPORTE_IMPREVISTOS",name: "Transporte e Imprevistos (fijo)",   value: 600000,  unit: "fijo",    sortOrder: 7 },
          // Legacy — mantenidos por compatibilidad con cotizaciones antiguas
          { category: "cocina_base", code: "COCINA_ML_LINEAL",      name: "Cocina Lineal [legacy]",            value: 900000,  unit: "ml",      sortOrder: 8 },
          { category: "cocina_base", code: "COCINA_ML_L",           name: "Cocina en L [legacy]",              value: 900000,  unit: "ml",      sortOrder: 9 },
          { category: "cocina_base", code: "COCINA_ML_U",           name: "Cocina en U [legacy]",              value: 900000,  unit: "ml",      sortOrder: 10 },
          { category: "cocina_base", code: "COCINA_ML_SOLO_MUEBLES",name: "Solo muebles [legacy]",             value: 900000,  unit: "ml",      sortOrder: 11 },
          // Mesones
          { category: "mesones", code: "MESON_GRANITO",            name: "Mesón Granito (fondo estándar)",    value: 700000,  unit: "ml",      sortOrder: 1 },
          { category: "mesones", code: "MESON_CUARZO",             name: "Mesón Cuarzo (fondo estándar)",     value: 850000,  unit: "ml",      sortOrder: 2 },
          { category: "mesones", code: "MESON_SINTERIZADO",        name: "Mesón Sinterizado (fondo std)",     value: 1200000, unit: "ml",      sortOrder: 3 },
          { category: "mesones", code: "MESON_ACERO",              name: "Mesón Acero Inoxidable",            value: 800000,  unit: "ml",      sortOrder: 4 },
          { category: "mesones", code: "MESON_GRANITO_ANGOSTA",    name: "Mesón Granito (fondo angosto)",     value: 490000,  unit: "ml",      sortOrder: 5 },
          { category: "mesones", code: "MESON_CUARZO_ANGOSTA",     name: "Mesón Cuarzo (fondo angosto)",      value: 600000,  unit: "ml",      sortOrder: 6 },
          { category: "mesones", code: "MESON_SINTERIZADO_ANGOSTA",name: "Mesón Sinterizado (fondo angosto)", value: 1000000, unit: "ml",      sortOrder: 7 },
          { category: "mesones", code: "MESON_RECARGO_FONDO",      name: "Recargo fondo 61–90cm (%)",         value: 30,      unit: "%",       sortOrder: 8, description: "Porcentaje adicional al precio del mesón. 61-90cm: +30%. 91-120cm: ×2." },
          { category: "mesones", code: "LAVAPLATOS_MESON",         name: "Orificio lavaplatos",               value: 130000,  unit: "unidad",  sortOrder: 9 },
          // Muebles Especiales
          { category: "muebles_especiales", code: "NICHO_NEVECON",      name: "Nicho Nevecón",           value: 1200000, unit: "unidad", sortOrder: 1, description: "Descuenta 1.0 ml al precio base." },
          { category: "muebles_especiales", code: "NICHO_NEVERA",       name: "Nicho Nevera pequeña",    value: 1100000, unit: "unidad", sortOrder: 2, description: "Descuenta 0.75 ml al precio base." },
          { category: "muebles_especiales", code: "ALACENA_ENTREPANOS", name: "Alacena con Entrepaños",  value: 1250000, unit: "unidad", sortOrder: 3, description: "Descuenta 0.5 ml al precio base." },
          { category: "muebles_especiales", code: "ALACENA_HERRAJE",    name: "Alacena con Herraje",     value: 900000,  unit: "unidad", sortOrder: 4, description: "Descuenta 0.5 ml al precio base." },
          { category: "muebles_especiales", code: "TORRE_HORNOS",       name: "Torre para Hornos",       value: 1350000, unit: "unidad", sortOrder: 5, description: "Descuenta 0.7 ml al precio base." },
          // Extras
          { category: "extras", code: "ISLA_ML",      name: "Isla (por ml)",         value: 900000,  unit: "ml",     sortOrder: 1 },
          { category: "extras", code: "ISLA_LATERAL", name: "Lateral de Isla",        value: 350000,  unit: "unidad", sortOrder: 2 },
          { category: "extras", code: "BARRA_ML",     name: "Barra (por ml)",         value: 900000,  unit: "ml",     sortOrder: 3 },
          { category: "extras", code: "BARRA_LATERAL",name: "Lateral de Barra",       value: 350000,  unit: "unidad", sortOrder: 4 },
          { category: "extras", code: "LED_ML",       name: "LED (por ml)",           value: 220000,  unit: "ml",     sortOrder: 5 },
          // Puertas y Tapas (cocinas)
          { category: "puertas_tapas", code: "PUERTA_SUP_70",     name: "Puerta Superior 70cm",  value: 120000, unit: "unidad", sortOrder: 1 },
          { category: "puertas_tapas", code: "PUERTA_SUP_90",     name: "Puerta Superior 90cm",  value: 150000, unit: "unidad", sortOrder: 2 },
          { category: "puertas_tapas", code: "PUERTA_SUP_100",    name: "Puerta Superior 100cm", value: 180000, unit: "unidad", sortOrder: 3 },
          { category: "puertas_tapas", code: "PUERTA_INF",        name: "Puerta Inferior",       value: 150000, unit: "unidad", sortOrder: 4 },
          { category: "puertas_tapas", code: "PUERTA_ALACENA",    name: "Puerta Alacena",        value: 180000, unit: "unidad", sortOrder: 5 },
          { category: "puertas_tapas", code: "TAPA_CAJON",        name: "Tapa Cajón",            value: 90000,  unit: "unidad", sortOrder: 6 },
          { category: "puertas_tapas", code: "TAPA_PEQUENA",      name: "Tapa Pequeña",          value: 45000,  unit: "unidad", sortOrder: 7 },
          { category: "puertas_tapas", code: "PINTADO_SUP",       name: "Alto Brillo Puerta Sup",value: 120000, unit: "unidad", sortOrder: 8 },
          { category: "puertas_tapas", code: "PINTADO_INF",       name: "Alto Brillo Puerta Inf",value: 150000, unit: "unidad", sortOrder: 9 },
          { category: "puertas_tapas", code: "PINTADO_ALACENA",   name: "Alto Brillo Alacena",   value: 250000, unit: "unidad", sortOrder: 10 },
          { category: "puertas_tapas", code: "PINTADO_CAJON",     name: "Alto Brillo Cajón",     value: 80000,  unit: "unidad", sortOrder: 11 },
          { category: "puertas_tapas", code: "PINTADO_ESPECIERO", name: "Alto Brillo Especiero", value: 100000, unit: "unidad", sortOrder: 12 },
          { category: "puertas_tapas", code: "PINTADO_GOLA",      name: "Alto Brillo Gola",      value: 45000,  unit: "unidad", sortOrder: 13 },
          // Closets
          { category: "closets", code: "CLOSET_ESTANDAR_M2",  name: "Closet Estándar (m²)",  value: 750000, unit: "m2", sortOrder: 1 },
          { category: "closets", code: "CLOSET_ESPECIAL_M2",  name: "Closet Especial (m²)",  value: 650000, unit: "m2", sortOrder: 2 },
          { category: "closets", code: "CLOSET_EMPOTRADO_M2", name: "Closet Empotrado (m²)", value: 900000, unit: "m2", sortOrder: 3 },
          // Puertas (Producto)
          { category: "puertas_producto", code: "PUERTA_BATIENTE_50_85",    name: "Batiente ancho 50–85 cm",    value: 890000,  unit: "unidad", sortOrder: 1, description: "Incluye: Marco RH, chapa gama alta, bisagras omega, tope, instalación." },
          { category: "puertas_producto", code: "PUERTA_BATIENTE_85_110",   name: "Batiente ancho 85–110 cm",   value: 950000,  unit: "unidad", sortOrder: 2, description: "Incluye: Marco RH, chapa gama alta, bisagras omega, tope, instalación." },
          { category: "puertas_producto", code: "PUERTA_CORREDIZA_50_85",   name: "Corrediza ancho 50–85 cm",   value: 1250000, unit: "unidad", sortOrder: 3, description: "Incluye: Riel, guías, instalación." },
          { category: "puertas_producto", code: "PUERTA_CORREDIZA_85_110",  name: "Corrediza ancho 85–110 cm",  value: 1350000, unit: "unidad", sortOrder: 4, description: "Incluye: Riel, guías, instalación." },
          { category: "puertas_producto", code: "PUERTA_BATIENTE",          name: "Puerta Batiente (alias)",     value: 890000,  unit: "unidad", sortOrder: 5 },
          { category: "puertas_producto", code: "PUERTA_CORREDIZA_SENCILLA",name: "Corrediza Sencilla (alias)", value: 1250000, unit: "unidad", sortOrder: 6 },
          { category: "puertas_producto", code: "PUERTA_CORREDIZA_DOBLE",   name: "Corrediza Doble (alias)",    value: 1350000, unit: "unidad", sortOrder: 7 },
          // Centros de TV
          { category: "centros_tv", code: "TV_CENTER_BASE",         name: "Centro TV base (hasta 1.60m)", value: 2800000, unit: "unidad", sortOrder: 1, description: "Cada 20cm adicionales suma $500.000." },
          { category: "centros_tv", code: "TV_CENTER_ALTO_BRILLO",  name: "Incremento Alto Brillo",       value: 350000,  unit: "unidad", sortOrder: 2 },
          { category: "centros_tv", code: "TV_CENTER_LED",          name: "LED (por ml)",                 value: 220000,  unit: "ml",     sortOrder: 3 },
          { category: "centros_tv", code: "TV_CENTER_REPISA",       name: "Repisa adicional",             value: 100000,  unit: "unidad", sortOrder: 4 },
          { category: "centros_tv", code: "TV_CENTER_ESPACIO_EQUIPO",name:"Espacio para equipo",          value: 150000,  unit: "unidad", sortOrder: 5 },
          { category: "centros_tv", code: "TV_CENTER_TRANSPORTE",   name: "Transporte e imprevistos",     value: 150000,  unit: "unidad", sortOrder: 6 },
          // Acabados Especiales
          { category: "acabados_especiales", code: "ACABADO_ALUMINIO_VIDRIO_M2", name: "Aluminio + Vidrio (m²)", value: 1200000, unit: "m2",  sortOrder: 1 },
          { category: "acabados_especiales", code: "ACABADO_BISAGRA_PAR",        name: "Bisagra (par)",          value: 15000,   unit: "par", sortOrder: 2 },
          { category: "acabados_especiales", code: "ACABADO_LED_ML",             name: "LED acabados (por ml)",  value: 150000,  unit: "ml",  sortOrder: 3 },
        ] as const;

        let created = 0;
        let skipped = 0;
        for (const item of CATALOG) {
          const existing = await db.getPricingByCode(item.code);
          if (!existing) {
            await db.createPricingConfig({
              category: item.category as any,
              code: item.code,
              name: item.name,
              description: (item as any).description,
              value: item.value,
              unit: item.unit,
              sortOrder: item.sortOrder,
            });
            created++;
          } else {
            skipped++;
          }
        }
        return { created, skipped, total: CATALOG.length };
      }),
});

