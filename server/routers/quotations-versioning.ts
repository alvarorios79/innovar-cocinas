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

        // Actualizar el proyecto para que apunte a la nueva versión
        const project = await getProjectByQuotationId(input.quotationId);
        if (project && newQuotation) {
          // PHASE 2: Sync projects.totalAmount with new quotation.total
          await updateProject(project.id, {
            quotationId: newQuotationId,
            totalAmount: (Number(newQuotation.total) || 0).toString(),
          });
        } else if (!project) {
          // Buscar si el proyecto está asociado a la cotización base
          const versionInfo = await versioning.getQuotationVersionInfo(input.quotationId);
          if (versionInfo?.baseQuotationId) {
            const baseProject = await getProjectByQuotationId(versionInfo.baseQuotationId);
            if (baseProject && newQuotation) {
              // PHASE 2: Sync projects.totalAmount with new quotation.total
              await updateProject(baseProject.id, {
                quotationId: newQuotationId,
                totalAmount: (Number(newQuotation.total) || 0).toString(),
              });
            }
          }
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
});
