/**
 * tRPC Router for Quotation Versioning
 * 
 * Procedures:
 * - createVersion: Create new version of a quotation
 * - getVersionChain: Get all versions of a quotation
 * - getVersionInfo: Get versioning info for a quotation
 * - lockQuotation: Lock an approved quotation
 * - unlockQuotation: Unlock a quotation (admin/super_admin only)
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as versioning from "../quotation-versioning";
import { getProjectByQuotationId, updateProject } from "../db";

export const quotationsVersioningRouter = router({
  createVersion: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para crear versiones de cotizaciones",
        });
      }

      try {
        const newQuotationId = await versioning.createQuotationVersion(
          input.quotationId,
          ctx.user.id
        );

        // Import getQuotationById to fetch the new quotation
        const { getQuotationById } = await import("../db");
        const newQuotation = await getQuotationById(newQuotationId);

        // FASE 2: Generar PDF automáticamente para la nueva versión
        if (newQuotation) {
          try {
            console.log(`[VERSIONING] Generando PDF para nueva versión: ${newQuotationId}`);
            
            const { getClientById, getQuotationItems } = await import("../db");
            const { generateQuotationPDF } = await import("../quotation-pdf-generator");
            const { storagePut } = await import("../storage");
            const { readFileSync } = await import("fs");
            
            const client = await getClientById(newQuotation.clientId);
            const quotationItems = await getQuotationItems(newQuotationId);
            
            if (client && quotationItems) {
              const pdfData = {
                quotationNumber: newQuotation.quotationNumber,
                date: newQuotation.createdAt ? new Date(newQuotation.createdAt).toLocaleDateString("es-CO") : new Date().toLocaleDateString("es-CO"),
                clientName: client.name,
                clientPhone: client.whatsappPhone || "",
                clientAddress: client.address || "",
                vendorName: newQuotation.vendorName || "",
                productType: newQuotation.productType || "",
                validUntil: newQuotation.validUntil ? new Date(newQuotation.validUntil).toLocaleDateString("es-CO") : new Date().toLocaleDateString("es-CO"),
                items: quotationItems.map((item: any) => ({
                  itemNumber: item.itemNumber || 0,
                  description: item.description || "Item",
                  quantity: String(item.quantity || "1"),
                  unitPrice: item.unitPrice ? String(item.unitPrice) : undefined,
                  totalPrice: String(item.totalPrice || "0"),
                })),
                subtotal: String(newQuotation.subtotal || "0"),
                transportCost: String(newQuotation.transportCost || "0"),
                discountPercent: newQuotation.discountPercent ? String(newQuotation.discountPercent) : undefined,
                discountAmount: newQuotation.discountAmount ? String(newQuotation.discountAmount) : undefined,
                total: String(newQuotation.total || "0"),
              };
              
              const versionNumber = newQuotation.versionNumber || 1;
              const { pdfPath } = await generateQuotationPDF(pdfData, newQuotationId, versionNumber);
              const pdfBuffer = readFileSync(pdfPath);
              const s3Key = `quotations/${client.id}/${newQuotationId}/v${versionNumber}.pdf`;
              const { url: pdfUrl } = await storagePut(s3Key, pdfBuffer, "application/pdf");
              
              // Actualizar la cotización con la URL del PDF
              const { updateQuotation } = await import("../db");
              await updateQuotation(newQuotationId, { pdfUrl });
              
              console.log(`[VERSIONING] PDF generado exitosamente para versión V${versionNumber}: ${pdfUrl}`);
            }
          } catch (pdfError: any) {
            console.error(`[VERSIONING] Error generando PDF para nueva versión:`, pdfError?.message);
            // No lanzar error, solo registrar. La versión se crea aunque falle el PDF
          }
        }

        // Actualizar el proyecto para que apunte a la nueva versión
        // Buscar proyecto vinculado a CUALQUIER versión de esta cotización
        let project = null;
        
        // Obtener todas las versiones de la cotización
        const allVersions = await versioning.getQuotationVersionChain(input.quotationId);
        console.log(`[VERSIONING] Cadena de versiones encontradas: ${allVersions.map(v => v.id).join(', ')}`);
        
        // Buscar proyecto en cualquier versión
        for (const version of allVersions) {
          project = await getProjectByQuotationId(version.id);
          if (project) {
            console.log(`[VERSIONING] Proyecto encontrado en versión ${version.versionNumber} (ID: ${version.id})`);
            break;
          }
        }
        
        // Si encuentra proyecto, actualizar a la nueva versión
        if (project && newQuotation) {
          console.log(`[VERSIONING] Actualizando proyecto ${project.id} de V${project.quotationId} a nueva versión V${newQuotation.versionNumber} (ID: ${newQuotationId})`);
          const newTotal = String(Number(newQuotation.total) || 0);
          console.log(`[VERSIONING] Nuevo totalAmount a guardar: ${newTotal}`);
          await updateProject(project.id, {
            quotationId: newQuotationId,
            totalAmount: newTotal,
          });
          console.log(`[VERSIONING] Proyecto ${project.id} actualizado exitosamente. Nuevo total: $${newQuotation.total}`);
        } else if (!project) {
          console.log(`[VERSIONING] No se encontró proyecto vinculado a ninguna versión de la cotización ${input.quotationId}`);
        }

        return { newQuotationId };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Error al crear versión de cotización",
        });
      }
    }),

  getVersionChain: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        const chain = await versioning.getQuotationVersionChain(input.quotationId);
        return { versions: chain };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al obtener cadena de versiones",
        });
      }
    }),

  getVersionInfo: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .query(async ({ input }) => {
      const info = await versioning.getQuotationVersionInfo(input.quotationId);
      if (!info) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cotización no encontrada",
        });
      }
      return info;
    }),

  lockQuotation: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await versioning.lockQuotation(input.quotationId, ctx.user.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Error al bloquear cotización",
        });
      }
    }),

  unlockQuotation: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = ["admin", "super_admin"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden desbloquear cotizaciones",
        });
      }

      try {
        await versioning.unlockQuotation(input.quotationId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al desbloquear cotización",
        });
      }
    }),

  setActiveVersion: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para cambiar versiones de cotizaciones",
        });
      }

      try {
        const result = await versioning.setActiveVersion(input.quotationId, ctx.user.id);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Error al activar versión de cotización",
        });
      }
    }),

  deleteVersion: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = ["admin", "super_admin"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden eliminar versiones de cotizaciones",
        });
      }

      try {
        const result = await versioning.deleteVersion(input.quotationId, ctx.user.id);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Error al eliminar versión de cotización",
        });
      }
    }),
});
