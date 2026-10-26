import { z } from "zod";
import { router, protectedProcedure, adminProcedure, superAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { accountingClosures, accountingClosureProjects } from "../../drizzle/schema";
import {
  getPendingClosureProjects,
  createAccountingClosure,
  getAccountingClosures,
  getClosureDetails,
  confirmAccountingClosure,
  revertAccountingClosure,
  getClosureProjects,
  getClosureReportsByPeriod,
  getClosureSummary,
  getMonthlyClosureSummary,
  generateClosurePDF,
  generateClosureAnnexPDF,
  getDb,
  notifyOwnerClosureConfirmed,
  generateClosureExcel,
  logClosureAudit,
  getClosureAuditLog,
  getClosureAuditSummary,
  getUserAuditActions,
  getEligibleProjectsForAccountingClosure,
  getArchivedProjectsForClosure,
  getConfirmedClosures,
  getClosedProjects,
  calculateClosurePreview,

} from "../db";

export const accountingClosuresRouter = router({
  /**
   * Get eligible projects for accounting closure (archived + fully paid + no closure)
   */
  getPendingProjects: adminProcedure.query(async () => {
    try {
      const projects = await getEligibleProjectsForAccountingClosure();
      return projects;
    } catch (error) {
      console.error("[AccountingClosures] Error getting pending projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener proyectos elegibles para cierre",
      });
    }
  }),

  /**
   * Create a new accounting closure
   */
  create: adminProcedure
    .input(
      z.object({
        periodStart: z.date(),
        periodEnd: z.date(),
        projectIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Validate period dates
        if (input.periodStart >= input.periodEnd) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La fecha de inicio debe ser anterior a la fecha de fin",
          });
        }

        // Validate project IDs
        if (input.projectIds.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Debe seleccionar al menos un proyecto",
          });
        }

        const closureId = await createAccountingClosure({
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          createdBy: ctx.user.id,
          projectIds: input.projectIds,
        });

        return { closureId, message: "Cierre contable creado exitosamente" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[AccountingClosures] Error creating closure:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear cierre contable",
        });
      }
    }),

  /**
   * Get list of closures
   */
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["draft", "confirmed"]).optional(),
        periodStart: z.date().optional(),
        periodEnd: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const closures = await getAccountingClosures({
          status: input.status,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        });
        return closures;
      } catch (error) {
        console.error("[AccountingClosures] Error listing closures:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener cierres contables",
        });
      }
    }),

  /**
   * Get closure details
   */
  getDetails: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .query(async ({ input }) => {
      try {
        const closure = await getClosureDetails(input.closureId);
        if (!closure) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cierre contable no encontrado",
          });
        }
        return closure;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[AccountingClosures] Error getting closure details:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener detalles del cierre",
        });
      }
    }),

  /**
   * Confirm an accounting closure
   */
  confirm: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify closure exists
        const closure = await getClosureDetails(input.closureId);
        if (!closure) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cierre contable no encontrado",
          });
        }

        // Verify closure is in draft status
        if (closure.status !== "draft") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Solo cierres en estado borrador pueden ser confirmados",
          });
        }

        await confirmAccountingClosure(input.closureId, ctx.user.id);

        // Send notification to owner
        await notifyOwnerClosureConfirmed(input.closureId, ctx.user.id).catch((error) => {
          console.error("[AccountingClosures] Error sending notification:", error);
        });

        return { message: "Cierre contable confirmado exitosamente" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[AccountingClosures] Error confirming closure:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al confirmar cierre contable",
        });
      }
    }),

  /**
   * Revert an accounting closure from CONFIRMED back to DRAFT.
   * Solo super_admin puede revertir — requiere motivo obligatorio.
   * Los gastos tardíos deben registrarse en el siguiente período, no reabrir el cierre.
   */
  revert: superAdminProcedure
    .input(z.object({
      closureId: z.number(),
      reason: z.string().min(10, "El motivo debe tener al menos 10 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify closure exists
        const closure = await getClosureDetails(input.closureId);
        if (!closure) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cierre contable no encontrado",
          });
        }

        // Verify closure is in confirmed status
        if (closure.status !== "confirmed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Solo cierres confirmados pueden ser revertidos",
          });
        }

        const result = await revertAccountingClosure(input.closureId, ctx.user.id, input.reason);

        return {
          message: "Cierre contable revertido exitosamente",
          projectsUnlinked: result.projectsUnlinked,
          revertedAt: result.revertedAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[AccountingClosures] Error reverting closure:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al revertir cierre contable",
        });
      }
    }),

  /**
   * Get projects in a closure
   */
  getProjects: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .query(async ({ input }) => {
      try {
        const projects = await getClosureProjects(input.closureId);
        return projects;
      } catch (error) {
        console.error("[AccountingClosures] Error getting closure projects:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener proyectos del cierre",
        });
      }
    }),

  /**
   * Get closure reports by period with filtering
   */
  getReportsByPeriod: adminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["draft", "confirmed", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      try {
        const reports = await getClosureReportsByPeriod(
          input.startDate,
          input.endDate,
          input.status
        );
        return reports;
      } catch (error) {
        console.error("[AccountingClosures] Error getting reports:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener reportes de cierres",
        });
      }
    }),

  /**
   * Get closure summary statistics
   */
  getSummary: adminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const summary = await getClosureSummary(input.startDate, input.endDate);
        return summary;
      } catch (error) {
        console.error("[AccountingClosures] Error getting summary:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener resumen de cierres",
        });
      }
    }),

  /**
   * Get monthly closure summary for charts
   */
  getMonthlySummary: adminProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(6),
      })
    )
    .query(async ({ input }) => {
      try {
        const monthlySummary = await getMonthlyClosureSummary(input.months);
        return monthlySummary;
      } catch (error) {
        console.error("[AccountingClosures] Error getting monthly summary:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener resumen mensual de cierres",
        });
      }
    }),

  /**
   * Generate PDF for closure
   */
  generatePDF: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .query(async ({ input }) => {
      try {
        const htmlContent = await generateClosurePDF(input.closureId);
        return {
          html: htmlContent,
          filename: `cierre-contable-${input.closureId}.pdf`,
        };
      } catch (error) {
        console.error("[AccountingClosures] Error generating PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar PDF del cierre",
        });
      }
    }),

  /**
   * Generate detailed annex PDF (bodega + project expenses breakdown)
   */
  generateAnnexPDF: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .query(async ({ input }) => {
      try {
        const htmlContent = await generateClosureAnnexPDF(input.closureId);
        return {
          html: htmlContent,
          filename: `cierre-${input.closureId}-anexo-gastos.pdf`,
        };
      } catch (error) {
        console.error("[AccountingClosures] Error generating annex PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar el anexo de gastos",
        });
      }
    }),

  /**
   * Generate Excel for closure
   */
  generateExcel: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .query(async ({ input }) => {
      try {
        const buffer = await generateClosureExcel(input.closureId);
        return {
          buffer: buffer.toString("base64"),
          filename: `cierre-contable-${input.closureId}.xlsx`,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      } catch (error) {
        console.error("[AccountingClosures] Error generating Excel:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar Excel del cierre",
        });
      }
    }),

  /**
   * Get audit log for a closure
   */
  getAuditLog: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .query(async ({ input }) => {
      try {
        const logs = await getClosureAuditLog(input.closureId);
        return logs;
      } catch (error) {
        console.error("[AccountingClosures] Error getting audit log:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener registro de auditoría",
        });
      }
    }),

  /**
   * Get audit summary for a closure
   */
  getAuditSummary: adminProcedure
    .input(z.object({ closureId: z.number() }))
    .query(async ({ input }) => {
      try {
        const summary = await getClosureAuditSummary(input.closureId);
        return summary;
      } catch (error) {
        console.error("[AccountingClosures] Error getting audit summary:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener resumen de auditoría",
        });
      }
    }),

  /**
   * Get user audit actions
   */
  getUserActions: adminProcedure
    .input(z.object({ userId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      try {
        const actions = await getUserAuditActions(input.userId, input.limit);
        return actions;
      } catch (error) {
        console.error("[AccountingClosures] Error getting user actions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener acciones del usuario",
        });
      }
    }),

  /**
   * Get projects eligible for accounting closure
   * Criteria: archived, no closure assigned, balance = 0 (fully paid)
   */
  getEligibleProjects: adminProcedure.query(async () => {
    try {
      const projects = await getEligibleProjectsForAccountingClosure();
      return projects;
    } catch (error) {
      console.error("[AccountingClosures] Error getting eligible projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener proyectos elegibles para cierre",
      });
    }
  }),

  /**
   * Get all archived projects without closure
   * Includes projects with pending payments
   */
  getArchivedProjects: adminProcedure.query(async () => {
    try {
      const projects = await getArchivedProjectsForClosure();
      return projects;
    } catch (error) {
      console.error("[AccountingClosures] Error getting archived projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener proyectos archivados",
      });
    }
  }),
  /**
   * Get confirmed closures with their projects
   */
  getConfirmed: adminProcedure
    .input(
      z.object({
        periodStart: z.date().optional(),
        periodEnd: z.date().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      try {
        const closures = await getConfirmedClosures({
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          limit: input.limit,
        });
        return closures;
      } catch (error) {
        console.error("[AccountingClosures] Error getting confirmed closures:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener cierres confirmados",
        });
      }
    }),

  /**
   * Get closed projects (projects linked to confirmed closures)
   */
  getClosedProjects: adminProcedure
    .input(
      z.object({
        closureId: z.number().optional(),
        clientId: z.number().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      try {
        const projects = await getClosedProjects({
          closureId: input.closureId,
          clientId: input.clientId,
          limit: input.limit,
        });
        return projects;
      } catch (error) {
        console.error("[AccountingClosures] Error getting closed projects:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener proyectos cerrados",
        });
      }
    }),

  /**
   * Calculate closure preview with real calculations
   * Shows what the closure will contain before creating it
   */
  calculatePreview: adminProcedure
    .input(
      z.object({
        projectIds: z.array(z.number()),
      })
    )
    .query(async ({ input }) => {
      try {
        const preview = await calculateClosurePreview(input.projectIds);
        return preview;
      } catch (error) {
        console.error("[AccountingClosures] Error calculating preview:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al calcular preview del cierre",
        });
      }
    }),


});
