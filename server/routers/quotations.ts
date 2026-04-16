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
import { eq, inArray, or } from "drizzle-orm";
import { projects, quotations } from "../../drizzle/schema";


export const quotationsRouter = router({
    // Crear nueva cotización con items
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        vendorName: z.string(),
        productType: z.enum(["cocina", "closet", "puerta", "centro_tv", "herrajes", "mesones", "acabados_especiales", "otro"]).optional(),
        discountPercent: z.number().min(0).max(100).optional().default(0),
        items: z.array(z.object({
          itemNumber: z.number(),
          itemType: z.string(),
          description: z.string(),
          quantity: z.string(),
          unitPrice: z.string().optional(),
          totalPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          includesFixedCosts: z.boolean().optional(),
          fixedCostsAmount: z.number().optional(),
          kitchenConfig: z.any().optional(),
          hardwareSelections: z.array(z.object({
            hardwareId: z.number(),
            name: z.string(),
            price: z.string(),
            quantity: z.number(),
            subtotal: z.number(),
          })).optional(),
          closetConfig: z.any().optional(),
          doorConfig: z.any().optional(),
          tvCenterConfig: z.any().optional(),
          countertopConfig: z.any().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Si no se especifica productType, usar el itemType del primer item
        const productType = input.productType || (input.items[0]?.itemType as any) || "otro";
        // Solo admin, super_admin y comercial pueden crear cotizaciones
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para crear cotizaciones" });
        }

        // Calcular subtotal (suma de todos los items)
        const subtotal = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Calcular descuento
        const discountPercent = input.discountPercent || 0;
        const discountAmount = subtotal * (discountPercent / 100);
        
        // El transporte ya está incluido en el totalPrice de cada item si includesFixedCosts=true
        // Por lo tanto, el total es simplemente la suma de todos los items menos el descuento
        const transportCost = 0; // No agregar transporte adicional
        const total = subtotal - discountAmount;

        // Fecha de validez: 7 días desde hoy
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        // Crear cotización con items en transacción
        const quotationId = await withTransaction(async (tx) => {
          const qId = await db.createQuotation({
            clientId: input.clientId,
            vendorName: input.vendorName,
            productType,
            status: "draft",
            validUntil: validUntil.toISOString(),
            subtotal: subtotal.toString(),
            transportCost: transportCost.toString(),
            discountPercent: discountPercent.toString(),
            discountAmount: discountAmount.toString(),
            total: total.toString(),
            createdBy: ctx.user.id,
          });

          for (const item of input.items) {
            await db.createQuotationItem({
              quotationId: qId,
              itemNumber: item.itemNumber,
              itemType: item.itemType,
              description: sanitizeText(item.description) || "Item",
              quantity: item.quantity || "1",
              unitPrice: item.unitPrice || null,
              totalPrice: item.totalPrice.toString(),
              includesFixedCosts: (item.includesFixedCosts ? 1 : 0) as any,
              fixedCostsAmount: item.fixedCostsAmount != null ? item.fixedCostsAmount.toString() : null,
              kitchenConfig: item.kitchenConfig ? JSON.stringify(item.kitchenConfig) : null,
              hardwareSelections: item.hardwareSelections ? JSON.stringify(item.hardwareSelections) : null,
              closetConfig: item.closetConfig ? JSON.stringify(item.closetConfig) : null,
              doorConfig: item.doorConfig ? JSON.stringify(item.doorConfig) : null,
              tvCenterConfig: item.tvCenterConfig ? JSON.stringify(item.tvCenterConfig) : null,
              countertopConfig: item.countertopConfig ? JSON.stringify(item.countertopConfig) : null,
            });
          }

          return qId;
        });

        // Generar PDF automaticamente
        try {
          console.log("[PDF] Iniciando generación de PDF para cotización:", quotationId);
          const quotation = await db.getQuotationById(quotationId);
          const client = await db.getClientById(input.clientId);
          
          console.log("[PDF] Cotización encontrada:", quotation?.quotationNumber);
          console.log("[PDF] Cotización completa:", JSON.stringify(quotation, null, 2));
          console.log("[PDF] Cliente encontrado:", client?.name);
          console.log("[PDF] Cliente completo:", JSON.stringify(client, null, 2));
          
          if (!quotation) {
            console.error("[PDF] ERROR: Cotización no encontrada con ID:", quotationId);
          }
          if (!client) {
            console.error("[PDF] ERROR: Cliente no encontrado con ID:", input.clientId);
          }
          
          if (quotation && client) {
            const { generateQuotationPDF } = await import("../quotation-pdf-generator");
            const { storagePut } = await import("../storage");
            const { readFileSync } = await import("fs");
            
            // Obtener los items de la cotización
            const quotationItems = await db.getQuotationItems(quotationId);
            console.log("[PDF] Items obtenidos:", quotationItems.length);
            
            // Preparar datos para el PDF
            const pdfData = {
              quotationNumber: quotation.quotationNumber,
              date: quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("es-CO") : new Date().toLocaleDateString("es-CO"),
              clientName: client.name,
              clientPhone: client.whatsappPhone,
              clientAddress: client.address || "",
              vendorName: input.vendorName,
              productType: quotation.productType,
              validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("es-CO") : new Date().toLocaleDateString("es-CO"),
              items: quotationItems.map(item => ({
                itemNumber: item.itemNumber,
                description: item.description || "Item",
                quantity: item.quantity || "1",
                unitPrice: item.unitPrice || undefined,
                totalPrice: item.totalPrice || "0",
              })),
              subtotal: quotation.subtotal,
              transportCost: quotation.transportCost,
              discountPercent: quotation.discountPercent || undefined,
              discountAmount: quotation.discountAmount || undefined,
              total: quotation.total,
            };
            
            console.log("[PDF] Generando PDF...");
            const { pdfPath } = await generateQuotationPDF(pdfData, quotationId, 1);
            console.log("[PDF] PDF generado en:", pdfPath);
            
            const pdfBuffer = readFileSync(pdfPath);
            console.log("[PDF] Buffer leído, tamaño:", pdfBuffer.length);
            
            // Subir a S3
            const s3Key = `quotations/${client.id}/${quotationId}/COT-${quotationId}.pdf`;
            console.log("[PDF] Subiendo a S3 con clave:", s3Key);
            const { url } = await storagePut(s3Key, pdfBuffer, "application/pdf");
            console.log("[PDF] URL retornada por S3:", url);
            
            // Actualizar la cotizacion con la URL del PDF
            console.log("[PDF] Actualizando cotización con URL:", url);
            await db.updateQuotation(quotationId, { pdfUrl: url });
            console.log("[PDF] Cotización actualizada correctamente");
          }
        } catch (error: any) {
          console.error("[PDF] Error generando PDF:", error?.message);
        }

        return { success: true, quotationId };
      }),

    // Actualizar cotización existente - AHORA CREA NUEVA VERSIÓN
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number().optional(),
        vendorName: z.string().optional(),
        productType: z.enum(["cocina", "closet", "puerta", "centro_tv", "herrajes", "mesones", "acabados_especiales", "otro"]).optional(),
        discountPercent: z.number().min(0).max(100).optional(),
        customDescriptions: z.record(z.string(), z.string()).optional(),
        generalNotes: z.string().optional(),
        items: z.array(z.object({
          itemNumber: z.number(),
          itemType: z.string(),
          description: z.string(),
          quantity: z.string(),
          unitPrice: z.string().optional(),
          totalPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          includesFixedCosts: z.boolean().optional(),
          fixedCostsAmount: z.number().optional(),
          kitchenConfig: z.any().optional(),
          hardwareSelections: z.array(z.object({
            hardwareId: z.number(),
            name: z.string(),
            price: z.string(),
            quantity: z.number(),
            subtotal: z.number(),
          })).optional(),
          closetConfig: z.any().optional(),
          doorConfig: z.any().optional(),
          tvCenterConfig: z.any().optional(),
          countertopConfig: z.any().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { id, items, ...quotationData } = input;

        // Obtener la cotización actual
        const currentQuotation = await db.getQuotationById(id);
        if (!currentQuotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
        }

        // Validar que no sea una copia histórica (solo lectura)
        if (currentQuotation.isHistoricalCopy) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No se puede editar una versión histórica. Actívala primero para hacer cambios." 
          });
        }

        // La mutación update SIEMPRE actualiza la cotización directamente.
        // La creación de nuevas versiones se maneja exclusivamente con el botón
           let newTotal: string | null = null;

        if (items) {
          const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
          const transportCost = 0;
          const discountPercent = input.discountPercent ?? 0;
          const discountAmount = subtotal * (discountPercent / 100);
          const total = subtotal - discountAmount;
          newTotal = total.toString();

          await withTransaction(async (tx) => {
            await db.deleteQuotationItems(id);
            for (const item of items) {
              await db.createQuotationItem({
                quotationId: id,
                itemNumber: item.itemNumber,
                itemType: item.itemType,
                description: sanitizeText(item.description) ?? "Item",
                quantity: item.quantity ?? "1",
                unitPrice: item.unitPrice ?? null,
                totalPrice: item.totalPrice.toString(),
                includesFixedCosts: (item.includesFixedCosts ? 1 : 0) as any,
                fixedCostsAmount: item.fixedCostsAmount != null ? item.fixedCostsAmount.toString() : null,
                kitchenConfig: item.kitchenConfig ? JSON.stringify(item.kitchenConfig) : null,
                hardwareSelections: item.hardwareSelections ? JSON.stringify(item.hardwareSelections) : null,
                closetConfig: item.closetConfig ? JSON.stringify(item.closetConfig) : null,
                doorConfig: item.doorConfig ? JSON.stringify(item.doorConfig) : null,
                tvCenterConfig: item.tvCenterConfig ? JSON.stringify(item.tvCenterConfig) : null,
                countertopConfig: item.countertopConfig ? JSON.stringify(item.countertopConfig) : null,
              });
            }
            await db.updateQuotation(id, {
              ...quotationData,
              subtotal: subtotal.toString(),
              transportCost: transportCost.toString(),
              discountPercent: discountPercent.toString(),
              discountAmount: discountAmount.toString(),
              total: newTotal,
            });
          });
        } else if (input.discountPercent !== undefined) {
          const subtotal = parseFloat(currentQuotation.subtotal);
          const discountPercent = input.discountPercent;
          const discountAmount = subtotal * (discountPercent / 100);
          const total = subtotal - discountAmount;
          newTotal = total.toString();
          await db.updateQuotation(id, {
            ...quotationData,
            discountPercent: discountPercent.toString(),
            discountAmount: discountAmount.toString(),
            total: newTotal,
          });
        } else {
          const { discountPercent: _, ...safeQuotationData } = quotationData;
          await db.updateQuotation(id, safeQuotationData);
          newTotal = currentQuotation.total;
        }

        // Actualizar proyecto si esta cotizacion esta vinculada a una
        if (newTotal) {
          try {
            // Buscar proyecto vinculado a esta cotización
            const linkedProject = await db.getProjectByQuotationId(id);
            if (linkedProject) {
              await db.updateProject(linkedProject.id, {
                totalAmount: newTotal.toString(),
              });
            }
          } catch (error) {
            console.error("[UPDATE_QUOTATION] Error updating project amount:", error);
          }
        }

        // Obtener projectId si existe para que el frontend lo invalide
        let projectId: number | null = null;
        try {
          const linkedProject = await db.getProjectByQuotationId(id);
          if (linkedProject) {
            projectId = linkedProject.id;
          }
        } catch (error) {
          console.error("[UPDATE_QUOTATION] Error getting projectId:", error);
        }

        return { success: true, quotationId: id, projectId };
      }),

    // Listar todas las cotizaciones (Admin)
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Optimización: ejecutar consultas en paralelo
          const [quotationsList, clients, allProjects] = await Promise.all([
          db.getAllQuotations(),
          db.getAllClients(),
          db.getAllProjects(),
        ]);
        // Crear mapa de quotationId -> projectId
        const projectMap = new Map(allProjects.filter(p => p.quotationId).map(p => [p.quotationId, p.id]));
        return quotationsList.map(quot => {
          const client = clients.find(c => c.id === quot.clientId);
          return {
            ...quot,
            client,
            projectId: projectMap.get(quot.id) || null,
          };
        });
      }),

    listPaginated: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        status: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await db.getAllQuotationsPaginated({
          page: input?.page,
          limit: input?.limit,
          status: input?.status,
        });
        const [allClients, allProjects] = await Promise.all([
          db.getAllClients(),
          db.getAllProjects(),
        ]);
        const clientMap = new Map(allClients.map(c => [c.id, c]));
        const projectMap = new Map(allProjects.filter(p => p.quotationId).map(p => [p.quotationId, p.id]));
        return {
          ...result,
          items: result.items.map((q: any) => ({ ...q, client: clientMap.get(q.clientId), projectId: projectMap.get(q.id) || null })),
        };
      }),

    listPaginatedGrouped: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        status: z.string().optional(),
        archived: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const page = input?.page || 1;
        const limit = input?.limit || 50;
        const result = await db.getAllQuotationsGroupedByBase({
          page,
          limit,
          status: input?.status,
          archived: input?.archived,
        });
        
        // Obtener todos los clientes para mapear
        const allClients = await db.getAllClients();
        const clientMap = new Map(allClients.map(c => [c.id, c]));
        
        // Mapear los clientes en los grupos
        const dataWithClients = result.data.map((group: any) => {
          // Obtener el clientId del activeVersion (que es la cotizacion actual)
          const clientId = group.activeVersion?.clientId;
          return {
            ...group,
            client: clientId ? clientMap.get(clientId) : null,
          };
        });
        
        console.log("[DIAGNOSTICO] listPaginatedGrouped result:", {
          quotationsCount: result.data.length,
          total: result.total,
          dataWithClientsCount: dataWithClients.length,
          firstQuotation: dataWithClients[0],
        });
        
        return {
          data: dataWithClients,
          total: result.total,
          page,
          limit,
        };
      }),

    // Obtener cotización por ID con items
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          const client = await db.getClientByUserId(ctx.user.id);
          if (!client || quotation.clientId !== client.id) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        const client = await db.getClientById(quotation.clientId);
        const items = await db.getQuotationItems(input.id);

        // Parsear kitchenConfig, hardwareSelections, closetConfig y doorConfig de string JSON a objeto
        const parsedItems = items.map(item => ({
          ...item,
          kitchenConfig: item.kitchenConfig && typeof item.kitchenConfig === 'string' 
            ? JSON.parse(item.kitchenConfig) 
            : item.kitchenConfig,
          hardwareSelections: item.hardwareSelections && typeof item.hardwareSelections === 'string'
            ? JSON.parse(item.hardwareSelections)
            : item.hardwareSelections,
          closetConfig: item.closetConfig && typeof item.closetConfig === 'string'
            ? JSON.parse(item.closetConfig)
            : item.closetConfig,
          doorConfig: item.doorConfig && typeof item.doorConfig === 'string'
            ? JSON.parse(item.doorConfig)
            : item.doorConfig,
          tvCenterConfig: item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
            ? JSON.parse(item.tvCenterConfig)
            : item.tvCenterConfig,
          countertopConfig: item.countertopConfig && typeof item.countertopConfig === 'string'
            ? JSON.parse(item.countertopConfig)
            : item.countertopConfig
        }));

        return {
          ...quotation,
          client,
          items: parsedItems,
        };
      }),

    // Obtener mis cotizaciones (Cliente)
    getMyQuotations: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) return [];

        return await db.getQuotationsByClientId(client.id);
      }),

    // Cambiar estado de cotización
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "approved", "rejected"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const updateData: any = { status: input.status };
        
        // Si se envía, registrar fecha
        if (input.status === "sent") {
          updateData.sentAt = new Date();
        }

        await db.updateQuotation(input.id, updateData);
        return { success: true };
      }),

    // Bloquear/Desbloquear cotización
    toggleLock: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin, super_admin y comercial pueden bloquear/desbloquear cotizaciones" });
        }

        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Alternar estado de bloqueo
        const newLockedState = !quotation.isLocked;
        const now = new Date();

        await db.updateQuotation(input.id, {
          isLocked: (newLockedState ? 1 : 0) as any,
          lockedAt: newLockedState ? now.toISOString() : null,
          lockedBy: newLockedState ? ctx.user.id : null,
        });

        const action = newLockedState ? "bloqueada" : "desbloqueada";
        return { 
          success: true, 
          message: `Cotizacion ${action} correctamente`
        };
      }),

    // Eliminar cotización
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Verificación de bloqueo pendiente en Mini-Fase 2

        await db.deleteQuotation(input.id);
        return { success: true };
      }),

    // Generar PDF de cotización
    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const client = await db.getClientById(quotation.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }

        const items = await db.getQuotationItems(input.id);

        // Preparar datos para el PDF
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
          clientName: client.name,
          clientPhone: client.whatsappPhone || undefined,
          clientAddress: client.address || undefined,
          vendorName: quotation.vendorName,
          productType: quotation.productType,
          validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
          items: items.map(item => {
            let description = item.description;
            
            // Parsear hardwareSelections si es string JSON
            const hardwareSelections = item.hardwareSelections && typeof item.hardwareSelections === 'string'
              ? JSON.parse(item.hardwareSelections)
              : item.hardwareSelections;
            
            // Parsear closetConfig si es string JSON
            const closetConfig = item.closetConfig && typeof item.closetConfig === 'string'
              ? JSON.parse(item.closetConfig)
              : item.closetConfig;
            
            // Parsear doorConfig si es string JSON
            const doorConfig = item.doorConfig && typeof item.doorConfig === 'string'
              ? JSON.parse(item.doorConfig)
              : item.doorConfig;
            
            // Parsear tvCenterConfig si es string JSON
            const tvCenterConfig = item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
              ? JSON.parse(item.tvCenterConfig)
              : item.tvCenterConfig;
            
            // Si es closet y tiene closetConfig, generar descripción detallada
            if (item.itemType === 'closet' && closetConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'estandar': 'Closet Estándar',
                'especial': 'Closet Especial',
                'empotrado': 'Closet Empotrado'
              };
              const doorLabels: Record<string, string> = {
                'corredizas': 'Puertas Corredizas',
                'batientes': 'Puertas Batientes'
              };
              
              lines.push(`${typeLabels[closetConfig.type] || closetConfig.type.toUpperCase()}`);
              lines.push(`Dimensiones: ${closetConfig.width}m (ancho) x ${closetConfig.height}m (alto)`);
              lines.push(`Profundidad: ${closetConfig.type === 'especial' ? '0.45cm o menos' : '0.60cm'}`);
              lines.push(`Área: ${closetConfig.squareMeters.toFixed(2)} M²`);
              lines.push(`Precio por M²: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(closetConfig.pricePerSquareMeter)}`);
              lines.push(`${doorLabels[closetConfig.doorType] || closetConfig.doorType}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Maletero');
              lines.push('• Divisor');
              lines.push('• Doble colgadero');
              lines.push('• Entrepaños');
              lines.push('• Doble cajonero');
              lines.push('• Zapatero');
              if (closetConfig.type === 'empotrado') {
                lines.push('• Espaldar y laterales completos');
              }
              
              // Agregar notas si existen
              if (closetConfig.notes && closetConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(closetConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es herrajes y tiene hardwareSelections, generar descripción detallada
            else if (item.itemType === 'herrajes' && hardwareSelections && Array.isArray(hardwareSelections) && hardwareSelections.length > 0) {
              const lines: string[] = [];
              lines.push('HERRAJES SELECCIONADOS');
              lines.push('');
              
              hardwareSelections.forEach((hw: any) => {
                const price = parseFloat(hw.price || '0');
                const subtotal = hw.subtotal || (price * hw.quantity);
                lines.push(`• ${hw.name}`);
                lines.push(`  Cantidad: ${hw.quantity} | Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)} | Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}`);
              });
              
              description = lines.join('\n');
            }
            // Si es puerta y tiene doorConfig, generar descripción detallada
            else if (item.itemType === 'puerta' && doorConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'batiente': 'Puerta Batiente',
                'corrediza': 'Puerta Corrediza'
              };
              const colorLabels: Record<string, string> = {
                'aluminio': 'Color Aluminio',
                'negro': 'Color Negro'
              };
              
              // Verificar si es estructura nueva (lista de puertas) o antigua (puerta única)
              if (doorConfig.doors && Array.isArray(doorConfig.doors)) {
                // Nueva estructura: lista de puertas
                const totalDoors = doorConfig.doors.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
                lines.push('PUERTAS - MADERA MACIZA TIPO RH');
                lines.push(`Total: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'}`);
                lines.push('');
                
                doorConfig.doors.forEach((door: any, idx: number) => {
                  const qty = door.quantity || 1;
                  const lineTotal = door.lineTotal || (door.pricePerUnit * qty);
                  lines.push(`Puerta ${idx + 1}: ${typeLabels[door.type] || door.type}`);
                  lines.push(`  • Medidas: ${door.width}cm × ${door.height}m`);
                  lines.push(`  • Cantidad: ${qty} ${qty === 1 ? 'unidad' : 'unidades'}`);
                  lines.push(`  • Accesorios: ${colorLabels[door.hardwareColor] || door.hardwareColor}`);
                  lines.push(`  • Dintel: ${door.hasLintel ? 'Sí' : 'No'}`);
                  if (door.location) {
                    lines.push(`  • Ubicación: ${door.location}`);
                  }
                  if (door.notes) {
                    lines.push(`  • Notas: ${door.notes}`);
                  }
                  lines.push(`  • Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(door.pricePerUnit)}`);
                  if (qty > 1) {
                    lines.push(`  • Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(lineTotal)}`);
                  }
                  if (idx < doorConfig.doors.length - 1) lines.push('');
                });
                
                lines.push('');
                lines.push('Todas incluyen:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push('• Instalación completa');
                
                // Transporte e imprevistos
                if (doorConfig.includeTransport && doorConfig.transportCost) {
                  lines.push('');
                  lines.push(`Transporte e Imprevistos: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.transportCost)}`);
                }
              } else {
                // Estructura antigua: puerta única (compatibilidad)
                lines.push(`${typeLabels[doorConfig.type] || doorConfig.type.toUpperCase()} - MADERA MACIZA TIPO RH`);
                lines.push(`Cantidad: ${doorConfig.quantity || 1} ${(doorConfig.quantity || 1) === 1 ? 'unidad' : 'unidades'}`);
                lines.push(`Ancho: ${doorConfig.width}cm (Rango: ${doorConfig.widthRange}cm)`);
                lines.push(`Altura: ${doorConfig.height}m (máx 2.40m)`);
                lines.push(`Precio por unidad: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.pricePerUnit)}`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push(`• Accesorios: ${colorLabels[doorConfig.hardwareColor] || doorConfig.hardwareColor}`);
                lines.push('• Instalación completa');
                
                if (doorConfig.type === 'corrediza') {
                  lines.push('• Sistema de riel incluido');
                }
              }
              
              // Agregar notas si existen
              if (doorConfig.notes && doorConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(doorConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es centro_tv y tiene tvCenterConfig, generar descripción detallada
            else if (item.itemType === 'centro_tv' && tvCenterConfig) {
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              lines.push('CENTRO DE TV - MUEBLE FLOTANTE');
              lines.push(`Ancho: ${tvCenterConfig.width}m`);
              lines.push(`Repisas flotantes: ${tvCenterConfig.floatingShelves}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Mueble flotante');
              lines.push('• Panel para TV con alistonado');
              lines.push(`• ${tvCenterConfig.floatingShelves} repisas flotantes`);
              
              if (tvCenterConfig.hasHighGloss) {
                lines.push('• Acabado alto brillo');
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push('• Iluminación LED');
              }
              if (tvCenterConfig.equipmentSpaces > 0) {
                lines.push(`• ${tvCenterConfig.equipmentSpaces} espacios para equipos`);
              }
              
              lines.push('');
              lines.push('Desglose:');
              lines.push(`• Mueble base ${tvCenterConfig.width}m: ${formatCurrency(tvCenterConfig.basePrice)}`);
              if (tvCenterConfig.hasHighGloss) {
                lines.push(`• Alto brillo: ${formatCurrency(tvCenterConfig.highGlossPrice)}`);
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push(`• Iluminación LED: ${formatCurrency(tvCenterConfig.ledLightsPrice)}`);
              }
              if (tvCenterConfig.extraShelvesPrice > 0) {
                lines.push(`• Repisas adicionales: ${formatCurrency(tvCenterConfig.extraShelvesPrice)}`);
              }
              if (tvCenterConfig.equipmentSpacesPrice > 0) {
                lines.push(`• Espacios para equipos: ${formatCurrency(tvCenterConfig.equipmentSpacesPrice)}`);
              }
              if (tvCenterConfig.includeTransport && tvCenterConfig.transportCost) {
                lines.push(`• Transporte e imprevistos: ${formatCurrency(tvCenterConfig.transportCost)}`);
              }
              
              if (tvCenterConfig.notes && tvCenterConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(tvCenterConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es mesones y tiene countertopConfig, generar descripción detallada
            else if (item.itemType === 'mesones' && item.countertopConfig) {
              const config = typeof item.countertopConfig === 'string' 
                ? JSON.parse(item.countertopConfig) 
                : item.countertopConfig;
              
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              // Verificar si es el nuevo formato con múltiples mesones
              if (config.mesones && Array.isArray(config.mesones)) {
                lines.push('MESONES EN PIEDRA');
                lines.push('');
                
                config.mesones.forEach((meson: any, index: number) => {
                  const tipoTexto = meson.tipo === 'meson' ? 'Mesón Estándar' : meson.tipo === 'isla' ? 'Isla' : 'Barra';
                  const materialTexto = meson.material === 'quarzo' ? 'Quarzo' : 'Sinterizado';
                  
                  lines.push(`${index + 1}. ${tipoTexto.toUpperCase()} EN ${materialTexto.toUpperCase()}`);
                  lines.push(`   ${meson.metrosLineales}ML x ${meson.fondo}cm de fondo`);
                  
                  // Incluidos según tipo
                  if (meson.tipo === 'meson') {
                    lines.push('   Incluye: Regrueso en el visto' + (meson.incluyeSalpicaderoAlto ? ', Salpicadero alto' : ', Salpicadero bajo 10cm'));
                    lines.push('   Pegado lavaplatos + Lavaplatos 45x37cm');
                  } else if (meson.tipo === 'isla') {
                    const extras = [];
                    extras.push('Regrueso en el visto');
                    if (meson.incluyeLaterales) extras.push('Laterales (1.8ML)');
                    if (meson.incluyeRegrueso) extras.push('Regrueso adicional (0.9ML)');
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  } else if (meson.tipo === 'barra') {
                    const extras = [];
                    extras.push('Regrueso en los vistos');
                    if (!meson.incluyeSalpicaderoAlto) extras.push('Salpicadero bajo 10cm');
                    else extras.push('Salpicadero alto');
                    if (meson.alturaLateral > 0) extras.push(`Lateral ${meson.alturaLateral}cm`);
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  }
                  
                  lines.push(`   Subtotal: ${formatCurrency(meson.subtotal)}`);
                  lines.push('');
                });
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas: ' + config.notes);
                }
              } else {
                // Formato antiguo (un solo mesón)
                const tipoTexto = config.tipo === 'meson' ? 'MESÓN' : config.tipo === 'isla' ? 'ISLA' : 'BARRA';
                const materialTexto = config.material === 'quarzo' ? 'QUARZO' : 'SINTERIZADO';
                
                lines.push(`${tipoTexto} EN ${materialTexto}`);
                lines.push(`Metros lineales: ${config.metrosLineales}ML`);
                lines.push(`Fondo: ${config.fondo}cm`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Regrueso en el visto');
                
                if (config.tipo === 'meson') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                  lines.push('• Pegado de lavaplatos (incluye lavaplatos 45x37cm)');
                } else if (config.tipo === 'barra') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                }
                
                if (config.tipo === 'isla' && config.incluyeLaterales) {
                  lines.push('• Laterales de isla (1.8ML)');
                }
                if (config.tipo === 'isla' && config.incluyeRegrueso) {
                  lines.push('• Regrueso de isla (0.9ML x 60cm)');
                }
                if (config.tipo === 'barra' && config.alturaLateral > 0) {
                  lines.push(`• Lateral de barra (${config.alturaLateral}cm)`);
                }
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`• Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas adicionales:');
                  lines.push(config.notes);
                }
              }
              
              description = lines.join('\n');
            }
            // Si es cocina y tiene kitchenConfig, generar descripción detallada
            else if (item.itemType === 'cocina' && item.kitchenConfig) {
              const config = typeof item.kitchenConfig === 'string' 
                ? JSON.parse(item.kitchenConfig) 
                : item.kitchenConfig;
              
              const lines: string[] = [];
              const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas'].includes(config.shape);
              
              // Título según la forma
              const shapeLabels: Record<string, string> = {
                'L': 'en L',
                'U': 'en U',
                'lineal': 'Lineal',
                'frente_pll': 'Frente PLL (Solo Inferiores)',
                'solo_superiores': 'Solo Muebles Superiores',
                'solo_inferiores': 'Solo Muebles Inferiores',
                'puertas_tapas': 'Puertas y Tapas'
              };
              const shapeLabel = shapeLabels[config.shape] || config.shape;
              lines.push(`COCINA INTEGRAL - ${shapeLabel}`);
              lines.push(`Metraje total: ${config.totalMeters.toFixed(2)}ml`);
              lines.push('');
              
              // Calcular metraje resultante (solo para cocinas completas)
              let deductions = 0;
              if (!isSpecialShape) {
                if (config.specialModules?.nichoNevecon) deductions += 1.0;
                if (config.specialModules?.nichoNevera) deductions += 0.75;
                if (config.specialModules?.alacenaEntrepanos) deductions += 0.5;
                if (config.specialModules?.alacenaHerraje) deductions += 0.5;
                if (config.specialModules?.torreHornos) deductions += 0.7;
              }
              const resultingMeters = Math.max(0, config.totalMeters - deductions);
              
              // Muebles lineales según la forma
              if (config.shape === 'frente_pll') {
                lines.push(`• Muebles Inferiores (Frente PLL): ${config.totalMeters.toFixed(2)}ml`);
                if (config.includeUpperModule && config.upperModuleMeters > 0) {
                  lines.push(`• Muebles Superiores: ${config.upperModuleMeters.toFixed(2)}ml`);
                }
              } else if (config.shape === 'solo_superiores') {
                lines.push(`• Muebles Superiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'solo_inferiores') {
                lines.push(`• Muebles Inferiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'puertas_tapas') {
                const dc = config.doorsAndCovers || {};
                if (dc.upperDoors70 > 0) lines.push(`• Puertas superiores 70cm: ${dc.upperDoors70} und`);
                if (dc.upperDoors90 > 0) lines.push(`• Puertas superiores 90cm: ${dc.upperDoors90} und`);
                if (dc.upperDoors100 > 0) lines.push(`• Puertas superiores 100cm: ${dc.upperDoors100} und`);
                if (dc.lowerDoors > 0) lines.push(`• Puertas inferiores: ${dc.lowerDoors} und`);
                if (dc.pantryDoors > 0) lines.push(`• Puertas alacena: ${dc.pantryDoors} und`);
                if (dc.drawerCovers > 0) lines.push(`• Tapas cajón: ${dc.drawerCovers} und`);
                if (dc.smallCovers > 0) lines.push(`• Tapas pequeñas: ${dc.smallCovers} und`);
              } else {
                // Cocinas completas (L, U, Lineal)
                lines.push(`• Muebles Inferiores: ${resultingMeters.toFixed(2)}ml`);
                lines.push(`• Muebles Superiores: ${resultingMeters.toFixed(2)}ml`);
              }
              
              // Muebles especiales
              if (config.specialModules.nichoNevecon) {
                lines.push(`• Nicho para nevecon 100cm`);
              }
              if (config.specialModules.nichoNevera) {
                lines.push(`• Nicho nevera estándar 75cm`);
              }
              if (config.specialModules.alacenaEntrepanos) {
                lines.push(`• Alacena con entrepaños 50cm`);
              }
              if (config.specialModules.alacenaHerraje) {
                lines.push(`• Alacena para herraje 50cm`);
              }
              if (config.specialModules.torreHornos) {
                lines.push(`• Torre de hornos 70cm`);
              }
              
              // Mesón principal
              if (config.countertop.type) {
                const countertopType = config.countertop.type === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                let surchargeText = '';
                
                if (config.countertop.depthSurcharge === '30percent') {
                  surchargeText = ' (fondo 61-90cm)';
                } else if (config.countertop.depthSurcharge === 'double') {
                  surchargeText = ' (fondo 91-120cm)';
                }
                
                lines.push(`• Mesón ${countertopType}: ${resultingMeters.toFixed(2)}ml${surchargeText}`);
              }
              
              // Isla
              if (config.island.enabled && config.island.meters > 0) {
                const islandLines: string[] = [];
                islandLines.push(`${config.island.meters.toFixed(2)}ml muebles`);
                
                if (config.island.countertopType) {
                  const islandCountertopType = config.island.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  islandLines.push(`mesón ${islandCountertopType}`);
                }
                
                if (config.island.hasLaterals) {
                  islandLines.push('con laterales');
                }
                
                lines.push(`• Isla: ${islandLines.join(', ')}`);
              }
              
              // Barra
              if (config.bar.enabled && config.bar.meters > 0) {
                const barLines: string[] = [];
                barLines.push(`${config.bar.meters.toFixed(2)}ml muebles`);
                
                if (config.bar.countertopType) {
                  const barCountertopType = config.bar.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  barLines.push(`mesón ${barCountertopType}`);
                }
                
                if (config.bar.hasLateral) {
                  barLines.push('con lateral');
                }
                
                lines.push(`• Barra: ${barLines.join(', ')}`);
              }
              
              // LED
              if (config.ledLighting > 0) {
                lines.push(`• Luz LED: ${config.ledLighting.toFixed(2)}ml`);
              }
              
              // Acabados Especiales
              if (config.specialFinishes?.enabled) {
                lines.push('');
                lines.push('ACABADOS ESPECIALES:');
                
                // Puertas de aluminio + vidrio ahumado
                if (config.specialFinishes.aluminumGlassDoors && config.specialFinishes.aluminumGlassDoors.length > 0) {
                  const totalDoors = config.specialFinishes.aluminumGlassDoors.length;
                  const totalSqm = config.specialFinishes.aluminumGlassDoors.reduce((sum: number, d: any) => sum + (d.height * d.width), 0);
                  lines.push(`• Puertas aluminio + vidrio ahumado: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'} (${totalSqm.toFixed(2)} m²)`);
                  config.specialFinishes.aluminumGlassDoors.forEach((door: any, idx: number) => {
                    const sqm = door.height * door.width;
                    const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
                    let hingeText = '';
                    if (extraHinges > 0) hingeText = ` (+${extraHinges} par${extraHinges > 1 ? 'es' : ''} bisagras)`;
                    lines.push(`  - Puerta ${idx + 1}: ${door.height.toFixed(2)}m x ${door.width.toFixed(2)}m = ${sqm.toFixed(2)} m²${hingeText}`);
                  });
                }
                
                // LED para alacenas
                if (config.specialFinishes.ledLighting?.enabled && config.specialFinishes.ledLighting.meters > 0) {
                  lines.push(`• LED para alacenas: ${config.specialFinishes.ledLighting.meters.toFixed(2)}ml`);
                }
              }
              
              // Pintado de puertas
              if (config.paintedDoors?.enabled) {
                const pd = config.paintedDoors;
                const totalPainted = (pd.upperQty || 0) + (pd.lowerQty || 0) + (pd.pantryQty || 0) + (pd.drawerQty || 0) + (pd.spiceQty || 0) + (pd.golaQty || 0);
                if (totalPainted > 0) {
                  lines.push('');
                  lines.push('PINTADO ALTO BRILLO:');
                  if (pd.upperQty > 0) lines.push(`• Puertas superiores: ${pd.upperQty}`);
                  if (pd.lowerQty > 0) lines.push(`• Puertas inferiores: ${pd.lowerQty}`);
                  if (pd.pantryQty > 0) lines.push(`• Puertas alacena: ${pd.pantryQty}`);
                  if (pd.drawerQty > 0) lines.push(`• Tapas cajón: ${pd.drawerQty}`);
                  if (pd.spiceQty > 0) lines.push(`• Especieros: ${pd.spiceQty}`);
                  if (pd.golaQty > 0) lines.push(`• Gola: ${pd.golaQty}`);
                }
              }
              
              description = lines.join('\n');
            }
            
            // Usar descripción personalizada si existe
            const customDescriptions = quotation.customDescriptions as Record<number, string> | null;
            const itemIndex = item.itemNumber - 1; // itemNumber es 1-based
            if (customDescriptions && customDescriptions[itemIndex]) {
              description = customDescriptions[itemIndex];
            }
            
            return {
              itemNumber: item.itemNumber,
              description,
              quantity: item.quantity,
              unitPrice: item.unitPrice || '',
              totalPrice: item.totalPrice,
            };
          }),
          subtotal: String(parseFloat(String(quotation.subtotal)) || 0),
          transportCost: String(parseFloat(String(quotation.transportCost)) || 0),
          discountPercent: String(parseFloat(String(quotation.discountPercent)) || 0),
          discountAmount: String(parseFloat(String(quotation.discountAmount)) || 0),
          total: String(parseFloat(String(quotation.total)) || 0),
          generalNotes: quotation.generalNotes || '',
          versionNumber: quotation.versionNumber || 1,
          baseQuotationNumber: quotation.baseQuotationId ? (await db.getQuotationById(quotation.baseQuotationId))?.quotationNumber : undefined,
        };

        // Generar PDF usando módulo separado
        try {
            const { generateQuotationPDF } = await import('../quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          // Extraer solo el nombre del archivo
          const path = await import('path');
          const filename = path.basename(result.pdfPath);
          
          // Devolver URL de descarga con nombre real como query param
          // Nota: el archivo se limpia en el endpoint /api/pdf/:filename después de servirlo
          const downloadUrl = `/api/pdf/${filename}?name=${encodeURIComponent(result.filename)}`;
          
          return {
            success: true,
            downloadUrl,
            filename: result.filename,
          };
        } catch (error: any) {
          console.error('[PDF] Error generando PDF:', error);
          console.error('[PDF] Stack trace:', error.stack);
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: `Error generando PDF: ${error.message}` 
          });
        }
      }),

    // Vista previa del PDF (genera PDF temporal para preview)
    previewPDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const client = await db.getClientById(quotation.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }

        const items = await db.getQuotationItems(input.id);

        // Preparar datos para el PDF (MISMA lógica completa que generatePDF)
        // Importar la función de generación de descripción de items
        const generateItemDescription = (item: any, quotation: any) => {
          let description = item.description;
          
          // Parsear configs
          const hardwareSelections = item.hardwareSelections && typeof item.hardwareSelections === 'string'
            ? JSON.parse(item.hardwareSelections)
            : item.hardwareSelections;
          const closetConfig = item.closetConfig && typeof item.closetConfig === 'string'
            ? JSON.parse(item.closetConfig)
            : item.closetConfig;
          const doorConfig = item.doorConfig && typeof item.doorConfig === 'string'
            ? JSON.parse(item.doorConfig)
            : item.doorConfig;
          const tvCenterConfig = item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
            ? JSON.parse(item.tvCenterConfig)
            : item.tvCenterConfig;
          
          const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
          
          // Si es closet y tiene closetConfig, generar descripción detallada
          if (item.itemType === 'closet' && closetConfig) {
            const lines: string[] = [];
            const typeLabels: Record<string, string> = {
              'estandar': 'Closet Estándar',
              'especial': 'Closet Especial',
              'empotrado': 'Closet Empotrado'
            };
            const doorLabels: Record<string, string> = {
              'corredizas': 'Puertas Corredizas',
              'batientes': 'Puertas Batientes'
            };
            
            lines.push(`${typeLabels[closetConfig.type] || closetConfig.type.toUpperCase()}`);
            lines.push(`Dimensiones: ${closetConfig.width}m (ancho) x ${closetConfig.height}m (alto)`);
            lines.push(`Profundidad: ${closetConfig.type === 'especial' ? '0.45cm o menos' : '0.60cm'}`);
            lines.push(`Área: ${closetConfig.squareMeters.toFixed(2)} M²`);
            lines.push(`Precio por M²: ${formatCurrency(closetConfig.pricePerSquareMeter)}`);
            lines.push(`${doorLabels[closetConfig.doorType] || closetConfig.doorType}`);
            lines.push('');
            lines.push('Incluye:');
            lines.push('• Maletero');
            lines.push('• Divisor');
            lines.push('• Doble colgadero');
            lines.push('• Entrepaños');
            lines.push('• Doble cajonero');
            lines.push('• Zapatero');
            if (closetConfig.type === 'empotrado') {
              lines.push('• Espaldar y laterales completos');
            }
            
            if (closetConfig.notes && closetConfig.notes.trim()) {
              lines.push('');
              lines.push('Notas adicionales:');
              lines.push(closetConfig.notes);
            }
            
            description = lines.join('\n');
          }
          // Si es herrajes y tiene hardwareSelections, generar descripción detallada
          else if (item.itemType === 'herrajes' && hardwareSelections && Array.isArray(hardwareSelections) && hardwareSelections.length > 0) {
            const lines: string[] = [];
            lines.push('HERRAJES SELECCIONADOS');
            lines.push('');
            
            hardwareSelections.forEach((hw: any) => {
              const price = parseFloat(hw.price || '0');
              const subtotal = hw.subtotal || (price * hw.quantity);
              lines.push(`• ${hw.name}`);
              lines.push(`  Cantidad: ${hw.quantity} | Precio unitario: ${formatCurrency(price)} | Subtotal: ${formatCurrency(subtotal)}`);
            });
            
            description = lines.join('\n');
          }
          // Si es puerta y tiene doorConfig, generar descripción detallada
          else if (item.itemType === 'puerta' && doorConfig) {
            const lines: string[] = [];
            const typeLabels: Record<string, string> = {
              'batiente': 'Puerta Batiente',
              'corrediza': 'Puerta Corrediza'
            };
            const colorLabels: Record<string, string> = {
              'aluminio': 'Color Aluminio',
              'negro': 'Color Negro'
            };
            
            if (doorConfig.doors && Array.isArray(doorConfig.doors)) {
              const totalDoors = doorConfig.doors.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
              lines.push('PUERTAS - MADERA MACIZA TIPO RH');
              lines.push(`Total: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'}`);
              lines.push('');
              
              doorConfig.doors.forEach((door: any, idx: number) => {
                const qty = door.quantity || 1;
                const lineTotal = door.lineTotal || (door.pricePerUnit * qty);
                lines.push(`Puerta ${idx + 1}: ${typeLabels[door.type] || door.type}`);
                lines.push(`  • Medidas: ${door.width}cm × ${door.height}m`);
                lines.push(`  • Cantidad: ${qty} ${qty === 1 ? 'unidad' : 'unidades'}`);
                lines.push(`  • Accesorios: ${colorLabels[door.hardwareColor] || door.hardwareColor}`);
                lines.push(`  • Dintel: ${door.hasLintel ? 'Sí' : 'No'}`);
                if (door.location) lines.push(`  • Ubicación: ${door.location}`);
                if (door.notes) lines.push(`  • Notas: ${door.notes}`);
                lines.push(`  • Precio unitario: ${formatCurrency(door.pricePerUnit)}`);
                if (qty > 1) lines.push(`  • Subtotal: ${formatCurrency(lineTotal)}`);
                if (idx < doorConfig.doors.length - 1) lines.push('');
              });
              
              lines.push('');
              lines.push('Todas incluyen:');
              lines.push('• Marco RH');
              lines.push('• Chapa gama alta');
              lines.push('• Bisagras omega');
              lines.push('• Tope de puerta');
              lines.push('• Instalación completa');
              
              if (doorConfig.includeTransport && doorConfig.transportCost) {
                lines.push('');
                lines.push(`Transporte e Imprevistos: ${formatCurrency(doorConfig.transportCost)}`);
              }
            }
            
            if (doorConfig.notes && doorConfig.notes.trim()) {
              lines.push('');
              lines.push('Notas adicionales:');
              lines.push(doorConfig.notes);
            }
            
            description = lines.join('\n');
          }
          // Si es centro_tv y tiene tvCenterConfig, generar descripción detallada
          else if (item.itemType === 'centro_tv' && tvCenterConfig) {
            const lines: string[] = [];
            
            lines.push('CENTRO DE TV - MUEBLE FLOTANTE');
            lines.push(`Ancho: ${tvCenterConfig.width}m`);
            lines.push(`Repisas flotantes: ${tvCenterConfig.floatingShelves}`);
            lines.push('');
            lines.push('Incluye:');
            lines.push('• Mueble flotante');
            lines.push('• Panel para TV con alistonado');
            lines.push(`• ${tvCenterConfig.floatingShelves} repisas flotantes`);
            
            if (tvCenterConfig.hasHighGloss) lines.push('• Acabado alto brillo');
            if (tvCenterConfig.hasLedLights) lines.push('• Iluminación LED');
            if (tvCenterConfig.equipmentSpaces > 0) lines.push(`• ${tvCenterConfig.equipmentSpaces} espacios para equipos`);
            
            lines.push('');
            lines.push('Desglose:');
            lines.push(`• Mueble base ${tvCenterConfig.width}m: ${formatCurrency(tvCenterConfig.basePrice)}`);
            if (tvCenterConfig.hasHighGloss) lines.push(`• Alto brillo: ${formatCurrency(tvCenterConfig.highGlossPrice)}`);
            if (tvCenterConfig.hasLedLights) lines.push(`• Iluminación LED: ${formatCurrency(tvCenterConfig.ledLightsPrice)}`);
            if (tvCenterConfig.extraShelvesPrice > 0) lines.push(`• Repisas adicionales: ${formatCurrency(tvCenterConfig.extraShelvesPrice)}`);
            if (tvCenterConfig.equipmentSpacesPrice > 0) lines.push(`• Espacios para equipos: ${formatCurrency(tvCenterConfig.equipmentSpacesPrice)}`);
            if (tvCenterConfig.includeTransport && tvCenterConfig.transportCost) {
              lines.push(`• Transporte e imprevistos: ${formatCurrency(tvCenterConfig.transportCost)}`);
            }
            
            if (tvCenterConfig.notes && tvCenterConfig.notes.trim()) {
              lines.push('');
              lines.push('Notas adicionales:');
              lines.push(tvCenterConfig.notes);
            }
            
            description = lines.join('\n');
          }
          // Si es cocina y tiene kitchenConfig, generar descripción detallada
          else if (item.itemType === 'cocina' && item.kitchenConfig) {
            const config = typeof item.kitchenConfig === 'string' 
              ? JSON.parse(item.kitchenConfig) 
              : item.kitchenConfig;
            
            const lines: string[] = [];
            const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas'].includes(config.shape);
            
            const shapeLabels: Record<string, string> = {
              'L': 'en L',
              'U': 'en U',
              'lineal': 'Lineal',
              'frente_pll': 'Frente PLL (Solo Inferiores)',
              'solo_superiores': 'Solo Muebles Superiores',
              'solo_inferiores': 'Solo Muebles Inferiores',
              'puertas_tapas': 'Puertas y Tapas'
            };
            const shapeLabel = shapeLabels[config.shape] || config.shape;
            lines.push(`COCINA INTEGRAL - ${shapeLabel}`);
            lines.push(`Metraje total: ${config.totalMeters.toFixed(2)}ml`);
            lines.push('');
            
            let deductions = 0;
            if (!isSpecialShape) {
              if (config.specialModules?.nichoNevecon) deductions += 1.0;
              if (config.specialModules?.nichoNevera) deductions += 0.75;
              if (config.specialModules?.alacenaEntrepanos) deductions += 0.5;
              if (config.specialModules?.alacenaHerraje) deductions += 0.5;
              if (config.specialModules?.torreHornos) deductions += 0.7;
            }
            const resultingMeters = Math.max(0, config.totalMeters - deductions);
            
            if (config.shape === 'frente_pll') {
              lines.push(`• Muebles Inferiores (Frente PLL): ${config.totalMeters.toFixed(2)}ml`);
              if (config.includeUpperModule && config.upperModuleMeters > 0) {
                lines.push(`• Muebles Superiores: ${config.upperModuleMeters.toFixed(2)}ml`);
              }
            } else if (config.shape === 'solo_superiores') {
              lines.push(`• Muebles Superiores: ${config.totalMeters.toFixed(2)}ml`);
            } else if (config.shape === 'solo_inferiores') {
              lines.push(`• Muebles Inferiores: ${config.totalMeters.toFixed(2)}ml`);
            } else if (config.shape === 'puertas_tapas') {
              const dc = config.doorsAndCovers || {};
              if (dc.upperDoors70 > 0) lines.push(`• Puertas superiores 70cm: ${dc.upperDoors70} und`);
              if (dc.upperDoors90 > 0) lines.push(`• Puertas superiores 90cm: ${dc.upperDoors90} und`);
              if (dc.upperDoors100 > 0) lines.push(`• Puertas superiores 100cm: ${dc.upperDoors100} und`);
              if (dc.lowerDoors > 0) lines.push(`• Puertas inferiores: ${dc.lowerDoors} und`);
              if (dc.pantryDoors > 0) lines.push(`• Puertas alacena: ${dc.pantryDoors} und`);
              if (dc.drawerCovers > 0) lines.push(`• Tapas cajón: ${dc.drawerCovers} und`);
              if (dc.smallCovers > 0) lines.push(`• Tapas pequeñas: ${dc.smallCovers} und`);
            } else {
              lines.push(`• Muebles Inferiores: ${resultingMeters.toFixed(2)}ml`);
              lines.push(`• Muebles Superiores: ${resultingMeters.toFixed(2)}ml`);
            }
            
            if (config.specialModules?.nichoNevecon) lines.push(`• Nicho para nevecon 100cm`);
            if (config.specialModules?.nichoNevera) lines.push(`• Nicho nevera estándar 75cm`);
            if (config.specialModules?.alacenaEntrepanos) lines.push(`• Alacena con entrepaños 50cm`);
            if (config.specialModules?.alacenaHerraje) lines.push(`• Alacena para herraje 50cm`);
            if (config.specialModules?.torreHornos) lines.push(`• Torre de hornos 70cm`);
            
            if (config.countertop?.type) {
              const countertopType = config.countertop.type === 'quarzone' ? 'Quarzone' : 'Sinterizado';
              let surchargeText = '';
              if (config.countertop.depthSurcharge === '30percent') surchargeText = ' (fondo 61-90cm)';
              else if (config.countertop.depthSurcharge === 'double') surchargeText = ' (fondo 91-120cm)';
              lines.push(`• Mesón ${countertopType}: ${resultingMeters.toFixed(2)}ml${surchargeText}`);
            }
            
            if (config.island?.enabled && config.island.meters > 0) {
              const islandLines: string[] = [];
              islandLines.push(`${config.island.meters.toFixed(2)}ml muebles`);
              if (config.island.countertopType) {
                const islandCountertopType = config.island.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                islandLines.push(`mesón ${islandCountertopType}`);
              }
              if (config.island.hasLaterals) islandLines.push('con laterales');
              lines.push(`• Isla: ${islandLines.join(', ')}`);
            }
            
            if (config.bar?.enabled && config.bar.meters > 0) {
              const barLines: string[] = [];
              barLines.push(`${config.bar.meters.toFixed(2)}ml muebles`);
              if (config.bar.countertopType) {
                const barCountertopType = config.bar.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                barLines.push(`mesón ${barCountertopType}`);
              }
              if (config.bar.hasLateral) barLines.push('con lateral');
              lines.push(`• Barra: ${barLines.join(', ')}`);
            }
            
            if (config.ledLighting > 0) {
              lines.push(`• Luz LED: ${config.ledLighting.toFixed(2)}ml`);
            }
            
            // Acabados Especiales
            if (config.specialFinishes?.enabled) {
              lines.push('');
              lines.push('ACABADOS ESPECIALES:');
              
              // Puertas de aluminio + vidrio ahumado
              if (config.specialFinishes.aluminumGlassDoors && config.specialFinishes.aluminumGlassDoors.length > 0) {
                const totalDoors = config.specialFinishes.aluminumGlassDoors.length;
                const totalSqm = config.specialFinishes.aluminumGlassDoors.reduce((sum: number, d: any) => sum + (d.height * d.width), 0);
                lines.push(`• Puertas aluminio + vidrio ahumado: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'} (${totalSqm.toFixed(2)} m²)`);
                config.specialFinishes.aluminumGlassDoors.forEach((door: any, idx: number) => {
                  const sqm = door.height * door.width;
                  const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
                  let hingeText = '';
                  if (extraHinges > 0) hingeText = ` (+${extraHinges} par${extraHinges > 1 ? 'es' : ''} bisagras)`;
                  lines.push(`  - Puerta ${idx + 1}: ${door.height.toFixed(2)}m x ${door.width.toFixed(2)}m = ${sqm.toFixed(2)} m²${hingeText}`);
                });
              }
              
              // LED para alacenas
              if (config.specialFinishes.ledLighting?.enabled && config.specialFinishes.ledLighting.meters > 0) {
                lines.push(`• LED para alacenas: ${config.specialFinishes.ledLighting.meters.toFixed(2)}ml`);
              }
            }
            
            // Pintado de puertas
            if (config.paintedDoors?.enabled) {
              const pd = config.paintedDoors;
              const totalPainted = (pd.upperQty || 0) + (pd.lowerQty || 0) + (pd.pantryQty || 0) + (pd.drawerQty || 0) + (pd.spiceQty || 0) + (pd.golaQty || 0);
              if (totalPainted > 0) {
                lines.push('');
                lines.push('PINTADO ALTO BRILLO:');
                if (pd.upperQty > 0) lines.push(`• Puertas superiores: ${pd.upperQty}`);
                if (pd.lowerQty > 0) lines.push(`• Puertas inferiores: ${pd.lowerQty}`);
                if (pd.pantryQty > 0) lines.push(`• Puertas alacena: ${pd.pantryQty}`);
                if (pd.drawerQty > 0) lines.push(`• Tapas cajón: ${pd.drawerQty}`);
                if (pd.spiceQty > 0) lines.push(`• Especieros: ${pd.spiceQty}`);
                if (pd.golaQty > 0) lines.push(`• Gola: ${pd.golaQty}`);
              }
            }
            
            description = lines.join('\n');
          }
          
          // Usar descripción personalizada si existe
          const customDescriptions = quotation.customDescriptions as Record<number, string> | null;
          const itemIndex = item.itemNumber - 1;
          if (customDescriptions && customDescriptions[itemIndex]) {
            description = customDescriptions[itemIndex];
          }
          
          return description;
        };
        
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
          clientName: client.name,
          clientPhone: client.whatsappPhone || undefined,
          clientAddress: client.address || undefined,
          vendorName: quotation.vendorName,
          productType: quotation.productType,
          validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
          items: items.map(item => {
            return {
              itemNumber: item.itemNumber,
              description: generateItemDescription(item, quotation),
              quantity: item.quantity,
              unitPrice: item.unitPrice || undefined,
              totalPrice: item.totalPrice,
            };
          }),
          subtotal: String(parseFloat(String(quotation.subtotal)) || 0),
          transportCost: String(parseFloat(String(quotation.transportCost)) || 0),
          discountPercent: String(parseFloat(String(quotation.discountPercent)) || 0),
          discountAmount: String(parseFloat(String(quotation.discountAmount)) || 0),
          total: String(parseFloat(String(quotation.total)) || 0),
          generalNotes: quotation.generalNotes || '',
          versionNumber: quotation.versionNumber || 1,
          baseQuotationNumber: quotation.baseQuotationId ? (await db.getQuotationById(quotation.baseQuotationId))?.quotationNumber : undefined,
        };

        try {
          const { generateQuotationPDF } = await import('../quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          const path = await import('path');
          const filename = path.basename(result.pdfPath);
          // Nota: el archivo se limpia en el endpoint /api/pdf/:filename después de servirlo
          const downloadUrl = `/api/pdf/${filename}?name=${encodeURIComponent(result.filename)}`;
          
          return {
            success: true,
            downloadUrl,
            filename: result.filename,
          };
        } catch (error: any) {
          console.error('[PDF Preview] Error:', error);
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: `Error generando vista previa: ${error.message}` 
          });
        }
      }),

    // Enviar cotización por email con PDF adjunto
    sendByEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const client = await db.getClientById(quotation.clientId);
        if (!client || !client.email) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente sin email" });
        }

        const items = await db.getQuotationItems(input.id);

        // Generar PDF
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
          clientName: client.name,
          clientPhone: client.whatsappPhone || undefined,
          clientAddress: client.address || undefined,
          vendorName: quotation.vendorName,
          productType: quotation.productType,
          validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
          items: items.map(item => {
            let description = item.description;
            
            // Parsear hardwareSelections si es string JSON
            const hardwareSelections = item.hardwareSelections && typeof item.hardwareSelections === 'string'
              ? JSON.parse(item.hardwareSelections)
              : item.hardwareSelections;
            
            // Parsear closetConfig si es string JSON
            const closetConfig = item.closetConfig && typeof item.closetConfig === 'string'
              ? JSON.parse(item.closetConfig)
              : item.closetConfig;
            
            // Parsear doorConfig si es string JSON
            const doorConfig = item.doorConfig && typeof item.doorConfig === 'string'
              ? JSON.parse(item.doorConfig)
              : item.doorConfig;
            
            // Parsear tvCenterConfig si es string JSON
            const tvCenterConfig = item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
              ? JSON.parse(item.tvCenterConfig)
              : item.tvCenterConfig;
            
            // Si es closet y tiene closetConfig, generar descripción detallada
            if (item.itemType === 'closet' && closetConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'estandar': 'Closet Estándar',
                'especial': 'Closet Especial',
                'empotrado': 'Closet Empotrado'
              };
              const doorLabels: Record<string, string> = {
                'corredizas': 'Puertas Corredizas',
                'batientes': 'Puertas Batientes'
              };
              
              lines.push(`${typeLabels[closetConfig.type] || closetConfig.type.toUpperCase()}`);
              lines.push(`Dimensiones: ${closetConfig.width}m (ancho) x ${closetConfig.height}m (alto)`);
              lines.push(`Profundidad: ${closetConfig.type === 'especial' ? '0.45cm o menos' : '0.60cm'}`);
              lines.push(`Área: ${closetConfig.squareMeters.toFixed(2)} M²`);
              lines.push(`Precio por M²: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(closetConfig.pricePerSquareMeter)}`);
              lines.push(`${doorLabels[closetConfig.doorType] || closetConfig.doorType}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Maletero');
              lines.push('• Divisor');
              lines.push('• Doble colgadero');
              lines.push('• Entrepaños');
              lines.push('• Doble cajonero');
              lines.push('• Zapatero');
              if (closetConfig.type === 'empotrado') {
                lines.push('• Espaldar y laterales completos');
              }
              
              // Agregar notas si existen
              if (closetConfig.notes && closetConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(closetConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es herrajes y tiene hardwareSelections, generar descripción detallada
            else if (item.itemType === 'herrajes' && hardwareSelections && Array.isArray(hardwareSelections) && hardwareSelections.length > 0) {
              const lines: string[] = [];
              lines.push('HERRAJES SELECCIONADOS');
              lines.push('');
              
              hardwareSelections.forEach((hw: any) => {
                const price = parseFloat(hw.price || '0');
                const subtotal = hw.subtotal || (price * hw.quantity);
                lines.push(`• ${hw.name}`);
                lines.push(`  Cantidad: ${hw.quantity} | Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)} | Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}`);
              });
              
              description = lines.join('\n');
            }
            // Si es puerta y tiene doorConfig, generar descripción detallada
            else if (item.itemType === 'puerta' && doorConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'batiente': 'Puerta Batiente',
                'corrediza': 'Puerta Corrediza'
              };
              const colorLabels: Record<string, string> = {
                'aluminio': 'Color Aluminio',
                'negro': 'Color Negro'
              };
              
              // Verificar si es estructura nueva (lista de puertas) o antigua (puerta única)
              if (doorConfig.doors && Array.isArray(doorConfig.doors)) {
                // Nueva estructura: lista de puertas
                const totalDoors = doorConfig.doors.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
                lines.push('PUERTAS - MADERA MACIZA TIPO RH');
                lines.push(`Total: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'}`);
                lines.push('');
                
                doorConfig.doors.forEach((door: any, idx: number) => {
                  const qty = door.quantity || 1;
                  const lineTotal = door.lineTotal || (door.pricePerUnit * qty);
                  lines.push(`Puerta ${idx + 1}: ${typeLabels[door.type] || door.type}`);
                  lines.push(`  • Medidas: ${door.width}cm × ${door.height}m`);
                  lines.push(`  • Cantidad: ${qty} ${qty === 1 ? 'unidad' : 'unidades'}`);
                  lines.push(`  • Accesorios: ${colorLabels[door.hardwareColor] || door.hardwareColor}`);
                  lines.push(`  • Dintel: ${door.hasLintel ? 'Sí' : 'No'}`);
                  if (door.location) {
                    lines.push(`  • Ubicación: ${door.location}`);
                  }
                  if (door.notes) {
                    lines.push(`  • Notas: ${door.notes}`);
                  }
                  lines.push(`  • Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(door.pricePerUnit)}`);
                  if (qty > 1) {
                    lines.push(`  • Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(lineTotal)}`);
                  }
                  if (idx < doorConfig.doors.length - 1) lines.push('');
                });
                
                lines.push('');
                lines.push('Todas incluyen:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push('• Instalación completa');
                
                // Transporte e imprevistos
                if (doorConfig.includeTransport && doorConfig.transportCost) {
                  lines.push('');
                  lines.push(`Transporte e Imprevistos: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.transportCost)}`);
                }
              } else {
                // Estructura antigua: puerta única (compatibilidad)
                lines.push(`${typeLabels[doorConfig.type] || doorConfig.type.toUpperCase()} - MADERA MACIZA TIPO RH`);
                lines.push(`Cantidad: ${doorConfig.quantity || 1} ${(doorConfig.quantity || 1) === 1 ? 'unidad' : 'unidades'}`);
                lines.push(`Ancho: ${doorConfig.width}cm (Rango: ${doorConfig.widthRange}cm)`);
                lines.push(`Altura: ${doorConfig.height}m (máx 2.40m)`);
                lines.push(`Precio por unidad: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.pricePerUnit)}`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push(`• Accesorios: ${colorLabels[doorConfig.hardwareColor] || doorConfig.hardwareColor}`);
                lines.push('• Instalación completa');
                
                if (doorConfig.type === 'corrediza') {
                  lines.push('• Sistema de riel incluido');
                }
              }
              
              // Agregar notas si existen
              if (doorConfig.notes && doorConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(doorConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es centro_tv y tiene tvCenterConfig, generar descripción detallada
            else if (item.itemType === 'centro_tv' && tvCenterConfig) {
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              lines.push('CENTRO DE TV - MUEBLE FLOTANTE');
              lines.push(`Ancho: ${tvCenterConfig.width}m`);
              lines.push(`Repisas flotantes: ${tvCenterConfig.floatingShelves}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Mueble flotante');
              lines.push('• Panel para TV con alistonado');
              lines.push(`• ${tvCenterConfig.floatingShelves} repisas flotantes`);
              
              if (tvCenterConfig.hasHighGloss) {
                lines.push('• Acabado alto brillo');
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push('• Iluminación LED');
              }
              if (tvCenterConfig.equipmentSpaces > 0) {
                lines.push(`• ${tvCenterConfig.equipmentSpaces} espacios para equipos`);
              }
              
              lines.push('');
              lines.push('Desglose:');
              lines.push(`• Mueble base ${tvCenterConfig.width}m: ${formatCurrency(tvCenterConfig.basePrice)}`);
              if (tvCenterConfig.hasHighGloss) {
                lines.push(`• Alto brillo: ${formatCurrency(tvCenterConfig.highGlossPrice)}`);
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push(`• Iluminación LED: ${formatCurrency(tvCenterConfig.ledLightsPrice)}`);
              }
              if (tvCenterConfig.extraShelvesPrice > 0) {
                lines.push(`• Repisas adicionales: ${formatCurrency(tvCenterConfig.extraShelvesPrice)}`);
              }
              if (tvCenterConfig.equipmentSpacesPrice > 0) {
                lines.push(`• Espacios para equipos: ${formatCurrency(tvCenterConfig.equipmentSpacesPrice)}`);
              }
              if (tvCenterConfig.includeTransport && tvCenterConfig.transportCost) {
                lines.push(`• Transporte e imprevistos: ${formatCurrency(tvCenterConfig.transportCost)}`);
              }
              
              if (tvCenterConfig.notes && tvCenterConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(tvCenterConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es mesones y tiene countertopConfig, generar descripción detallada
            else if (item.itemType === 'mesones' && item.countertopConfig) {
              const config = typeof item.countertopConfig === 'string' 
                ? JSON.parse(item.countertopConfig) 
                : item.countertopConfig;
              
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              // Verificar si es el nuevo formato con múltiples mesones
              if (config.mesones && Array.isArray(config.mesones)) {
                lines.push('MESONES EN PIEDRA');
                lines.push('');
                
                config.mesones.forEach((meson: any, index: number) => {
                  const tipoTexto = meson.tipo === 'meson' ? 'Mesón Estándar' : meson.tipo === 'isla' ? 'Isla' : 'Barra';
                  const materialTexto = meson.material === 'quarzo' ? 'Quarzo' : 'Sinterizado';
                  
                  lines.push(`${index + 1}. ${tipoTexto.toUpperCase()} EN ${materialTexto.toUpperCase()}`);
                  lines.push(`   ${meson.metrosLineales}ML x ${meson.fondo}cm de fondo`);
                  
                  // Incluidos según tipo
                  if (meson.tipo === 'meson') {
                    lines.push('   Incluye: Regrueso en el visto' + (meson.incluyeSalpicaderoAlto ? ', Salpicadero alto' : ', Salpicadero bajo 10cm'));
                    lines.push('   Pegado lavaplatos + Lavaplatos 45x37cm');
                  } else if (meson.tipo === 'isla') {
                    const extras = [];
                    extras.push('Regrueso en el visto');
                    if (meson.incluyeLaterales) extras.push('Laterales (1.8ML)');
                    if (meson.incluyeRegrueso) extras.push('Regrueso adicional (0.9ML)');
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  } else if (meson.tipo === 'barra') {
                    const extras = [];
                    extras.push('Regrueso en los vistos');
                    if (!meson.incluyeSalpicaderoAlto) extras.push('Salpicadero bajo 10cm');
                    else extras.push('Salpicadero alto');
                    if (meson.alturaLateral > 0) extras.push(`Lateral ${meson.alturaLateral}cm`);
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  }
                  
                  lines.push(`   Subtotal: ${formatCurrency(meson.subtotal)}`);
                  lines.push('');
                });
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas: ' + config.notes);
                }
              } else {
                // Formato antiguo (un solo mesón)
                const tipoTexto = config.tipo === 'meson' ? 'MESÓN' : config.tipo === 'isla' ? 'ISLA' : 'BARRA';
                const materialTexto = config.material === 'quarzo' ? 'QUARZO' : 'SINTERIZADO';
                
                lines.push(`${tipoTexto} EN ${materialTexto}`);
                lines.push(`Metros lineales: ${config.metrosLineales}ML`);
                lines.push(`Fondo: ${config.fondo}cm`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Regrueso en el visto');
                
                if (config.tipo === 'meson') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                  lines.push('• Pegado de lavaplatos (incluye lavaplatos 45x37cm)');
                } else if (config.tipo === 'barra') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                }
                
                if (config.tipo === 'isla' && config.incluyeLaterales) {
                  lines.push('• Laterales de isla (1.8ML)');
                }
                if (config.tipo === 'isla' && config.incluyeRegrueso) {
                  lines.push('• Regrueso de isla (0.9ML x 60cm)');
                }
                if (config.tipo === 'barra' && config.alturaLateral > 0) {
                  lines.push(`• Lateral de barra (${config.alturaLateral}cm)`);
                }
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`• Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas adicionales:');
                  lines.push(config.notes);
                }
              }
              
              description = lines.join('\n');
            }
            // Si es cocina y tiene kitchenConfig, generar descripción detallada
            else if (item.itemType === 'cocina' && item.kitchenConfig) {
              const config = typeof item.kitchenConfig === 'string' 
                ? JSON.parse(item.kitchenConfig) 
                : item.kitchenConfig;
              
              const lines: string[] = [];
              const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas'].includes(config.shape);
              
              // Título según la forma
              const shapeLabels: Record<string, string> = {
                'L': 'en L',
                'U': 'en U',
                'lineal': 'Lineal',
                'frente_pll': 'Frente PLL (Solo Inferiores)',
                'solo_superiores': 'Solo Muebles Superiores',
                'solo_inferiores': 'Solo Muebles Inferiores',
                'puertas_tapas': 'Puertas y Tapas'
              };
              const shapeLabel = shapeLabels[config.shape] || config.shape;
              lines.push(`COCINA INTEGRAL - ${shapeLabel}`);
              lines.push(`Metraje total: ${config.totalMeters.toFixed(2)}ml`);
              lines.push('');
              
              // Calcular metraje resultante (solo para cocinas completas)
              let deductions = 0;
              if (!isSpecialShape) {
                if (config.specialModules?.nichoNevecon) deductions += 1.0;
                if (config.specialModules?.nichoNevera) deductions += 0.75;
                if (config.specialModules?.alacenaEntrepanos) deductions += 0.5;
                if (config.specialModules?.alacenaHerraje) deductions += 0.5;
                if (config.specialModules?.torreHornos) deductions += 0.7;
              }
              const resultingMeters = Math.max(0, config.totalMeters - deductions);
              
              // Muebles lineales según la forma
              if (config.shape === 'frente_pll') {
                lines.push(`• Muebles Inferiores (Frente PLL): ${config.totalMeters.toFixed(2)}ml`);
                if (config.includeUpperModule && config.upperModuleMeters > 0) {
                  lines.push(`• Muebles Superiores: ${config.upperModuleMeters.toFixed(2)}ml`);
                }
              } else if (config.shape === 'solo_superiores') {
                lines.push(`• Muebles Superiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'solo_inferiores') {
                lines.push(`• Muebles Inferiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'puertas_tapas') {
                const dc = config.doorsAndCovers || {};
                if (dc.upperDoors70 > 0) lines.push(`• Puertas superiores 70cm: ${dc.upperDoors70} und`);
                if (dc.upperDoors90 > 0) lines.push(`• Puertas superiores 90cm: ${dc.upperDoors90} und`);
                if (dc.upperDoors100 > 0) lines.push(`• Puertas superiores 100cm: ${dc.upperDoors100} und`);
                if (dc.lowerDoors > 0) lines.push(`• Puertas inferiores: ${dc.lowerDoors} und`);
                if (dc.pantryDoors > 0) lines.push(`• Puertas alacena: ${dc.pantryDoors} und`);
                if (dc.drawerCovers > 0) lines.push(`• Tapas cajón: ${dc.drawerCovers} und`);
                if (dc.smallCovers > 0) lines.push(`• Tapas pequeñas: ${dc.smallCovers} und`);
              } else {
                // Cocinas completas (L, U, Lineal)
                lines.push(`• Muebles Inferiores: ${resultingMeters.toFixed(2)}ml`);
                lines.push(`• Muebles Superiores: ${resultingMeters.toFixed(2)}ml`);
              }
              
              // Muebles especiales
              if (config.specialModules.nichoNevecon) {
                lines.push(`• Nicho para nevecon 100cm`);
              }
              if (config.specialModules.nichoNevera) {
                lines.push(`• Nicho nevera estándar 75cm`);
              }
              if (config.specialModules.alacenaEntrepanos) {
                lines.push(`• Alacena con entrepaños 50cm`);
              }
              if (config.specialModules.alacenaHerraje) {
                lines.push(`• Alacena para herraje 50cm`);
              }
              if (config.specialModules.torreHornos) {
                lines.push(`• Torre de hornos 70cm`);
              }
              
              // Mesón principal
              if (config.countertop.type) {
                const countertopType = config.countertop.type === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                let surchargeText = '';
                
                if (config.countertop.depthSurcharge === '30percent') {
                  surchargeText = ' (fondo 61-90cm)';
                } else if (config.countertop.depthSurcharge === 'double') {
                  surchargeText = ' (fondo 91-120cm)';
                }
                
                lines.push(`• Mesón ${countertopType}: ${resultingMeters.toFixed(2)}ml${surchargeText}`);
              }
              
              // Isla
              if (config.island.enabled && config.island.meters > 0) {
                const islandLines: string[] = [];
                islandLines.push(`${config.island.meters.toFixed(2)}ml muebles`);
                
                if (config.island.countertopType) {
                  const islandCountertopType = config.island.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  islandLines.push(`mesón ${islandCountertopType}`);
                }
                
                if (config.island.hasLaterals) {
                  islandLines.push('con laterales');
                }
                
                lines.push(`• Isla: ${islandLines.join(', ')}`);
              }
              
              // Barra
              if (config.bar.enabled && config.bar.meters > 0) {
                const barLines: string[] = [];
                barLines.push(`${config.bar.meters.toFixed(2)}ml muebles`);
                
                if (config.bar.countertopType) {
                  const barCountertopType = config.bar.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  barLines.push(`mesón ${barCountertopType}`);
                }
                
                if (config.bar.hasLateral) {
                  barLines.push('con lateral');
                }
                
                lines.push(`• Barra: ${barLines.join(', ')}`);
              }
              
              // LED
              if (config.ledLighting > 0) {
                lines.push(`• Luz LED: ${config.ledLighting.toFixed(2)}ml`);
              }
              
              description = lines.join('\n');
            }
            
            return {
              itemNumber: item.itemNumber,
              description,
              quantity: item.quantity,
              unitPrice: item.unitPrice || '',
              totalPrice: item.totalPrice,
            };
          }),
          subtotal: quotation.subtotal,
          transportCost: quotation.transportCost,
          total: quotation.total,
        };

        try {
          // Generar PDF usando el mismo módulo que el botón PDF
          const { generateQuotationPDF } = await import('../quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          // Leer el PDF generado
          const fs = await import('fs');
          const pdfBuffer = fs.readFileSync(result.pdfPath);

          // Enviar email con Resend
          const { sendEmail } = await import('../email');
          await sendEmail({
            to: client.email,
            subject: `Cotización ${quotation.quotationNumber} - INNOVAR Cocinas`,
            html: `
              <h2>Hola ${client.name},</h2>
              <p>Adjunto encontrarás la cotización <strong>${quotation.quotationNumber}</strong> para tu proyecto de <strong>${quotation.productType}</strong>.</p>
              <p><strong>Total:</strong> ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(quotation.total))}</p>
              <p>Esta cotización tiene una validez de <strong>1 semana</strong>.</p>
              <br>
              <p>Quedamos atentos a cualquier consulta.</p>
              <p>Saludos cordiales,<br><strong>INNOVAR Cocinas Integrales</strong></p>
            `,
            attachments: [{
              filename: `${quotation.quotationNumber}.pdf`,
              content: pdfBuffer,
            }],
          });

          // Limpiar archivo temporal
          fs.unlinkSync(result.pdfPath);
          
          // Actualizar estado a "sent"
          await db.updateQuotation(input.id, { status: "sent", sentAt: new Date().toISOString() });

          // Enviar notificación WhatsApp al cliente (cotización lista)
          if (client.whatsappPhone) {
            try {
              await whatsappCloud.sendQuotationReady(
                client.whatsappPhone,
                client.name,
                quotation.quotationNumber,
                String(quotation.total)
              );
            } catch (waError) {
              console.error('[WhatsApp] Error enviando notificación de cotización:', waError);
              // No fallar el flujo principal si WhatsApp falla
            }
          }

          return { success: true };
        } catch (error: any) {
          console.error('Error enviando cotización:', error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error enviando cotización" });
        }
      }),

    // Enviar cotización por WhatsApp
    sendByWhatsApp: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        console.log("[WHATSAPP DEBUG] QUOTATION ID RECIBIDO:", input.id);
        
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        console.log("[WHATSAPP DEBUG] QUOTATION VERSION:", quotation.versionNumber);
        console.log("[WHATSAPP DEBUG] QUOTATION TOTAL:", quotation.total);

        const client = await db.getClientById(quotation.clientId);
        if (!client || !client.whatsappPhone) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente sin teléfono WhatsApp" });
        }
        
        console.log("[WHATSAPP DEBUG] Número original del cliente:", client.whatsappPhone);

        try {
          console.log("[WHATSAPP DEBUG] Iniciando proceso de envío por WhatsApp...");
          // Generar PDF de la cotizacion
          console.log("[WHATSAPP DEBUG] Generando PDF...");
          const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
          
          // @ts-ignore - Propiedades opcionales del quotation
          const pdfData = {
            quotationNumber: quotation.quotationNumber,
            date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
            clientName: client.name,
            clientEmail: client.email,
            clientPhone: client.whatsappPhone,
            items: (quotation as any).items || [],
            subtotal: quotation.subtotal || 0,
            discount: (quotation as any).discount || 0,
            tax: (quotation as any).tax || 0,
            total: quotation.total || 0,
            notes: (quotation as any).notes || "",
            validUntil: quotation.validUntil,
          };

          // Generar PDF
          const { generateQuotationPDF } = await import('../quotation-pdf-generator');
          // @ts-ignore
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          // Leer el PDF generado y subirlo a S3
          const fs = await import('fs');
          const pdfBuffer = fs.readFileSync(result.pdfPath);
          const { storagePut } = await import('../storage');
          
          const pdfKey = `quotations/${quotation.quotationNumber}-${Date.now()}.pdf`;
          const { url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, 'application/pdf');
          
          // Limpiar archivo temporal
          fs.unlinkSync(result.pdfPath);

          // Enviar plantilla con documento en un solo mensaje
          console.log("\n\n========== WHATSAPP QUOTATION FLOW START ==========");
          console.log("[WHATSAPP] Enviando plantilla con documento: cotizacion_pdf");
          console.log("[WHATSAPP] Idioma: es");
          console.log("[WHATSAPP] Cliente nombre:", client.name);
          console.log("[WHATSAPP] Número de teléfono destino:", client.whatsappPhone);
          console.log("[WHATSAPP] Cotización ID:", quotation.id);
          console.log("[WHATSAPP] Cotización número:", quotation.quotationNumber);
          console.log("[WHATSAPP] PDF URL:", pdfUrl);
          
          // Formatear monto total
          const formattedAmount = new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          }).format(Number(quotation.total));
          
          // Enviar plantilla con documento en el header (un solo mensaje)
          const templateWithDocResponse = await whatsappCloud.sendTemplateWithDocument(
            client.whatsappPhone,
            "cotizacion_pdf_v3",
            "es",
            pdfUrl,
            `Cotizacion_${quotation.quotationNumber.replace(/-/g, '_')}.pdf`,
            client.name,
            quotation.quotationNumber,
            formattedAmount
          );
          
          console.log("\n========== TEMPLATE WITH DOCUMENT RESPONSE ==========");
          console.log("[WHATSAPP] Status: " + (templateWithDocResponse.success ? "SUCCESS" : "FAILED"));
          console.log("[WHATSAPP] Full Response:", JSON.stringify(templateWithDocResponse, null, 2));
          if (templateWithDocResponse.messageId) {
            console.log("[WHATSAPP] Message ID:", templateWithDocResponse.messageId);
          }
          if (templateWithDocResponse.error) {
            console.log("[WHATSAPP] Error:", templateWithDocResponse.error);
            console.log("[WHATSAPP] Error Code:", templateWithDocResponse.errorCode);
          }
          console.log("========== END TEMPLATE WITH DOCUMENT RESPONSE ==========");
          
          if (!templateWithDocResponse.success) {
            console.error("[WhatsApp] Fallo en envio de plantilla con documento:", {
              success: templateWithDocResponse.success,
              error: templateWithDocResponse.error,
            });
            
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Error enviando plantilla con documento: ${templateWithDocResponse.error}`,
            });
          }
          
          console.log("\n========== WHATSAPP QUOTATION FLOW COMPLETED ==========");
          console.log("[WHATSAPP] Template with document sent: ✓");
          console.log("========== END FLOW ==========");
          console.log("\n");
          
          // Actualizar estado de la cotización a "sent"
          await db.updateQuotation(input.id, {
            status: "sent",
          });
          
          return {
            success: true,
            templateMessage: templateWithDocResponse,
            message: "Cotizacion enviada exitosamente por WhatsApp en un solo mensaje",
          };
        } catch (error: any) {
          console.error('Error enviando cotizacion por WhatsApp:', error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Error enviando cotizacion por WhatsApp" });
        }
      }),

    // Aprobar cotización desde el portal del cliente
    clientApprove: protectedProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
        receiptUrl: z.string().optional(),
        advanceAmount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el usuario tiene un cliente asociado
        const client = await db.getClientByUserId(ctx.user.id);
        
        // Obtener la cotización
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        }
        
        // Verificar que la cotización pertenece al cliente (o es admin/comercial)
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "comercial";
        if (!isAdmin && (!client || quotation.clientId !== client.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para aprobar esta cotización" });
        }
        
        // Verificar que la cotización está en estado "sent" (enviada)
        if (quotation.status !== "sent") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden aprobar cotizaciones enviadas" });
        }
        
        // Actualizar estado a "approved"
        await db.updateQuotation(input.id, {
          status: "approved",
          approvedAt: new Date().toISOString(),
        });
        
        // Obtener datos del cliente para la notificación
        const clientData = await db.getClientById(quotation.clientId);
        
        // GENERAR PDF DE LA COTIZACIÓN Y SUBIRLO A S3
        let quotationPdfUrl: string | null = null;
        try {
          const items = await db.getQuotationItems(input.id);
          
          // Preparar datos para el PDF
          const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
          
          const pdfData = {
            quotationNumber: quotation.quotationNumber,
            date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
            clientName: clientData?.name || 'Cliente',
            clientPhone: clientData?.whatsappPhone || undefined,
            clientAddress: clientData?.address || undefined,
            vendorName: quotation.vendorName,
            productType: quotation.productType,
            validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
            items: items.map(item => ({
              itemNumber: item.itemNumber,
              description: item.description,
              quantity: item.quantity.toString(),
              totalPrice: formatCurrency(Number(item.totalPrice)),
            })),
            subtotal: formatCurrency(Number(quotation.subtotal)),
            transportCost: formatCurrency(Number(quotation.transportCost || 0)),
            total: formatCurrency(Number(quotation.total)),
          };
          
          // Generar PDF
          const { generateQuotationPDF } = await import('../quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          // Leer el PDF generado y subirlo a S3
          const fs = await import('fs');
          const pdfBuffer = fs.readFileSync(result.pdfPath);
          const { storagePut } = await import('../storage');
          
          const pdfKey = `quotations/${quotation.quotationNumber}-${Date.now()}.pdf`;
          const { url } = await storagePut(pdfKey, pdfBuffer, 'application/pdf');
          quotationPdfUrl = url;
          
          // Limpiar archivo temporal
          fs.unlinkSync(result.pdfPath);
          

        } catch (pdfError: any) {
          console.error('[PDF] Error generando PDF de cotización:', pdfError);
          // No fallar la aprobación si el PDF falla, solo loguear el error
        }
        
        // CREAR PROYECTO AUTOMÁTICAMENTE
        // Determinar el tipo de trabajo basado en productType de la cotización
        const workTypeMap: Record<string, "cocina" | "closet" | "puertas" | "centro_tv"> = {
          cocina: "cocina",
          closet: "closet",
          puerta: "puertas",
          centro_tv: "centro_tv",
          herrajes: "cocina", // Por defecto
          mesones: "cocina", // Por defecto
          otro: "cocina", // Por defecto
        };
        
        const workType = workTypeMap[quotation.productType] || "cocina";
        const projectName = `${quotation.quotationNumber} - ${clientData?.name || "Cliente"}`;
        
        // Calcular fecha TENTATIVA de instalación: 25 días hábiles desde hoy
        const tentativeDate = await addBusinessDays(new Date(), 25);
        
        // Asignar automáticamente el diseñador con menos proyectos activos
        const autoAssignedDesignerId = await db.getDesignerWithLeastActiveProjects();
        
        const projectId = await db.createProject({
          quotationId: quotation.id,
          clientId: quotation.clientId,
          name: projectName,
          workType: workType,
          status: "cotizacion_aprobada",
          quotationApprovedAt: new Date().toISOString(),
          createdBy: ctx.user.id,
          advanceReceiptUrl: input.receiptUrl || null,
          advanceAmount: input.advanceAmount ? input.advanceAmount.toString() : null,
          quotationPdfUrl: quotationPdfUrl,
          tentativeInstallDate: tentativeDate ? (tentativeDate instanceof Date ? tentativeDate.toISOString() : tentativeDate) : null,
          isInstallDateOfficial: 0 as any,
          designerId: autoAssignedDesignerId,
        });
        
        // Crear historial de estado del proyecto
        await db.createProjectStatusHistory({
          projectId: projectId,
          fromStatus: "cotizacion_enviada",
          toStatus: "cotizacion_aprobada",
          changedBy: ctx.user.id,
          notes: `Proyecto creado automáticamente al aprobar cotización ${quotation.quotationNumber}${input.notes ? `. Notas del cliente: ${input.notes}` : ""}`,
        });
        
        // Notificar a super_admin, admin y comercial
        const admins = await db.getAllUsers();
        const notifyRoles = ["super_admin", "admin", "comercial"];
        const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
        
        // Obtener nombre del diseñador asignado para la notificación
        const assignedDesigner = autoAssignedDesignerId 
          ? admins.find(u => u.id === autoAssignedDesignerId)
          : null;
        const designerInfo = assignedDesigner 
          ? ` Diseñador asignado: ${assignedDesigner.name}.`
          : " Sin diseñador asignado (no hay diseñadores disponibles).";
        
        for (const user of usersToNotify) {
          await db.createNotification({
            userId: user.id,
            title: "¡Cotización Aprobada - Proyecto Creado!",
            body: `El cliente ${clientData?.name || ""} ha aprobado la cotización ${quotation.quotationNumber}. Se ha creado el proyecto #${projectId} automáticamente.${designerInfo}${input.notes ? ` Notas: ${input.notes}` : ""}`,
            type: "proyecto",
            referenceId: projectId,
            referenceType: "project",
          });
        }
        
        // Notificar al diseñador asignado
        if (autoAssignedDesignerId) {
          await db.createNotification({
            userId: autoAssignedDesignerId,
            title: "🎨 Nuevo Proyecto Asignado",
            body: `Se te ha asignado automáticamente el proyecto "${projectName}" del cliente ${clientData?.name || "Cliente"}. Cotización: ${quotation.quotationNumber}.`,
            type: "proyecto",
            referenceId: projectId,
            referenceType: "project",
          });
        }
        
        // Generar enlace de WhatsApp para notificar al comercial
        const whatsAppLink = whatsapp.notifyQuotationApproved({
          clientName: clientData?.name || "Cliente",
          clientPhone: clientData?.whatsappPhone || "",
          quotationNumber: quotation.quotationNumber,
          workType: quotation.productType,
          totalAmount: quotation.total,
          advanceAmount: input.advanceAmount?.toString(),
          portalUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL?.replace('/api', '') || ''}/proyectos`,
        });
        
        return { 
          success: true, 
          message: "Cotización aprobada y proyecto creado exitosamente",
          projectId: projectId,
          whatsAppLink: whatsAppLink,
        };
      }),

    // Rechazar cotización desde el portal del cliente
    clientReject: protectedProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(1, "Debe indicar el motivo del rechazo"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el usuario tiene un cliente asociado
        const client = await db.getClientByUserId(ctx.user.id);
        
        // Obtener la cotización
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        }
        
        // Verificar que la cotización pertenece al cliente (o es admin/comercial)
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "comercial";
        if (!isAdmin && (!client || quotation.clientId !== client.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para rechazar esta cotización" });
        }
        
        // Verificar que la cotización está en estado "sent" (enviada)
        if (quotation.status !== "sent") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden rechazar cotizaciones enviadas" });
        }
        
        // Actualizar estado a "rejected"
        await db.updateQuotation(input.id, {
          status: "rejected",
          rejectionReason: sanitizeText(input.reason),
        });
        
        // Obtener datos del cliente para la notificación
        const clientData = await db.getClientById(quotation.clientId);
        
        // Notificar a super_admin, admin y comercial
        const admins = await db.getAllUsers();
        const notifyRoles = ["super_admin", "admin"];
        const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
        
        for (const user of usersToNotify) {
          await db.createNotification({
            userId: user.id,
            title: "Cotización Rechazada",
            body: `El cliente ${clientData?.name || ""} ha rechazado la cotización ${quotation.quotationNumber}. Motivo: ${input.reason}`,
            type: "cotizacion",
            referenceId: input.id,
            referenceType: "quotation",
          });
        }
        
        return { success: true, message: "Cotización rechazada" };
      }),

    /*
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        appointmentId: z.number().optional(),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        kitchenShape: z.enum(["L", "U", "lineal"]).optional(),
        measurements: z.string().optional(),
        materialType: z.enum(["quarzone", "sinterizado"]).optional(),
        description: z.string().min(1),
        materials: z.string().optional(),
        totalPrice: z.string(),
        validUntil: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotationId = await db.createQuotation({
          clientId: input.clientId,
          appointmentId: input.appointmentId,
          workType: input.workType,
          kitchenShape: input.kitchenShape,
          measurements: input.measurements,
          materialType: input.materialType,
          description: sanitizeText(input.description),
          materials: input.materials,
          totalPrice: input.totalPrice,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
          createdBy: ctx.user.id,
          status: "draft",
        });

        return { id: quotationId, success: true };
      }),

    send: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const client = await db.getClientById(quotation.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }

        await db.updateQuotation(input.id, {
          status: "sent",
          sentAt: new Date(),
        });

        // Generar enlace de WhatsApp para enviar cotización
        const whatsappLink = whatsapp.sendQuotationToClient({
          clientName: client.name,
          clientPhone: client.whatsappPhone,
          workType: quotation.workType,
          description: quotation.description,
          totalPrice: quotation.totalPrice,
          validUntil: quotation.validUntil || undefined,
        });

        // Enviar notificación WhatsApp Cloud API al cliente (cotización lista)
        if (client.whatsappPhone) {
          try {
            await whatsappCloud.sendQuotationReady(
              client.whatsappPhone,
              client.name,
              quotation.quotationNumber || `COT-${quotation.id}`,
              String(quotation.totalPrice || quotation.total)
            );
          } catch (waError) {
            console.error('[WhatsApp] Error enviando notificación de cotización:', waError);
          }
        }

        return { success: true, whatsappLink };
      }),

    getMyQuotations: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) return [];
        
        return await db.getQuotationsByClientId(client.id);
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        // Optimización: ejecutar consultas en paralelo
        const [quotationsList2, clients] = await Promise.all([
          db.getAllQuotations(),
          db.getAllClients(),
        ]);
        
        return quotationsList2.map(quot => {
          const client = clients.find(c => c.id === quot.clientId);
          return {
            ...quot,
            client,
          };
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Si no es admin/comercial, verificar que sea su cotización
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          const client = await db.getClientByUserId(ctx.user.id);
          if (!client || quotation.clientId !== client.id) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        const client = await db.getClientById(quotation.clientId);
        return {
          ...quotation,
          client,
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar cotizaciones" });
        }
        
        await db.deleteQuotation(input.id);
        return { success: true };
      }),
    */

    // Crear proyecto manualmente desde cotización
    createProject: protectedProcedure
      .input(z.object({
        quotationId: z.number(),
        initialPayment: z.object({
          amount: z.number().min(0),
          method: z.string(),
          notes: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin y super_admin pueden crear proyectos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para crear proyectos" });
        }

        // Obtener la cotización
        const quotation = await db.getQuotationById(input.quotationId);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        }

        // Verificar que no exista ya un proyecto para esta cotización
        const existingProject = await db.getProjectByQuotationId(input.quotationId);
        if (existingProject) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya existe un proyecto para esta cotización" });
        }

        // Obtener datos del cliente
        const clientData = await db.getClientById(quotation.clientId);

        // Mapear tipo de producto a tipo de trabajo
        const workTypeMap: Record<string, "cocina" | "closet" | "puertas" | "centro_tv"> = {
          cocina: "cocina",
          closet: "closet",
          puertas: "puertas",
          centro_tv: "centro_tv",
          meson: "cocina",
          herrajes: "cocina",
          otro: "cocina",
        };
        
        const workType = workTypeMap[quotation.productType] || "cocina";
        const projectName = `${quotation.quotationNumber} - ${clientData?.name || "Cliente"}`;
        
        // Calcular fecha TENTATIVA de instalación: 25 días hábiles desde hoy
        const tentativeDate = await addBusinessDays(new Date(), 25);
        
        // Asignar automáticamente el diseñador con menos proyectos activos
        const autoAssignedDesignerId = await db.getDesignerWithLeastActiveProjects();
        
        // Crear el proyecto con datos financieros de la cotización
        const projectId = await db.createProject({
          quotationId: quotation.id,
          clientId: quotation.clientId,
          name: projectName,
          workType: workType,
          status: "cotizacion_aprobada",
          quotationApprovedAt: new Date().toISOString(),
          createdBy: ctx.user.id,
          tentativeInstallDate: tentativeDate ? (tentativeDate instanceof Date ? tentativeDate.toISOString() : tentativeDate) : null,
          isInstallDateOfficial: 0 as any,
          totalAmount: quotation.total, // Precio total de la cotización
          designerId: autoAssignedDesignerId,
        });
        
        // Crear historial de estado del proyecto
        await db.createProjectStatusHistory({
          projectId: projectId,
          fromStatus: "cotizacion_enviada",
          toStatus: "cotizacion_aprobada",
          changedBy: ctx.user.id,
          notes: `Proyecto creado manualmente desde cotización ${quotation.quotationNumber}`,
        });

        // Registrar pago inicial si se proporciona
        if (input.initialPayment && input.initialPayment.amount > 0) {
          // Validar que el monto no supere el total
          const quotationTotal = typeof quotation.total === 'string' ? parseFloat(quotation.total) : quotation.total;
          if (input.initialPayment.amount > quotationTotal) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `El pago inicial (${input.initialPayment.amount}) no puede superar el total del proyecto (${quotation.total})`,
            });
          }
          
          // Crear pago inicial
          await db.createPayment({
            projectId: projectId,
            amount: input.initialPayment.amount.toString(),
            type: "advance",
            method: input.initialPayment.method,
            notes: input.initialPayment.notes || "Pago inicial registrado al crear proyecto",
            registeredBy: ctx.user.id,
            receivedAt: new Date().toISOString(),
          });
        }

        // Actualizar el estado de la cotización a aprobada
        await db.updateQuotation(input.quotationId, {
          status: "approved",
        });
        
        // Notificar a super_admin, admin y comercial
        const admins = await db.getAllUsers();
        const notifyRoles = ["super_admin", "admin", "comercial"];
        const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
        
        // Obtener nombre del diseñador asignado para la notificación
        const assignedDesigner = autoAssignedDesignerId 
          ? admins.find(u => u.id === autoAssignedDesignerId)
          : null;
        const designerInfo = assignedDesigner 
          ? ` Diseñador asignado: ${assignedDesigner.name}.`
          : " Sin diseñador asignado.";
        
        for (const user of usersToNotify) {
          await db.createNotification({
            userId: user.id,
            title: "¡Proyecto Creado!",
            body: `Se ha creado el proyecto #${projectId} para ${clientData?.name || "Cliente"} desde la cotización ${quotation.quotationNumber}.${designerInfo}`,
            type: "proyecto",
            referenceId: projectId,
            referenceType: "project",
          });
        }
        
        // Notificar al diseñador asignado
        if (autoAssignedDesignerId) {
          await db.createNotification({
            userId: autoAssignedDesignerId,
            title: "🎨 Nuevo Proyecto Asignado",
            body: `Se te ha asignado automáticamente el proyecto "${projectName}" del cliente ${clientData?.name || "Cliente"}. Cotización: ${quotation.quotationNumber}.`,
            type: "proyecto",
            referenceId: projectId,
            referenceType: "project",
          });
        }
        
        return { 
          success: true, 
          projectId,
          message: `Proyecto #${projectId} creado exitosamente${assignedDesigner ? ` - Diseñador: ${assignedDesigner.name}` : ''}`
        };
      }),

      archive: protectedProcedure
        .input(z.object({ quotationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          try {
            if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin')) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso' });
            }
            await db.updateQuotation(input.quotationId, { isArchived: 1 });
            console.log({ action: 'ARCHIVE', entity: 'quotation', id: input.quotationId, user: ctx.user.id, timestamp: new Date() });
            return { success: true, message: 'Cotización archivada' };
          } catch (error) {
            console.error('ERROR ARCHIVING:', error);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al archivar' });
          }
        }),

      unarchive: protectedProcedure
        .input(z.object({ quotationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          try {
            if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin')) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso' });
            }
            await db.updateQuotation(input.quotationId, { isArchived: 0 });
            console.log({ action: 'UNARCHIVE', entity: 'quotation', id: input.quotationId, user: ctx.user.id, timestamp: new Date() });
            return { success: true, message: 'Cotización desarchivada' };
          } catch (error) {
            console.error('ERROR UNARCHIVING:', error);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al desarchivar' });
          }
        }),
});
