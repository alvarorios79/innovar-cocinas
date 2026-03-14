import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  getPendingClosureProjects,
  createAccountingClosure,
  getAccountingClosures,
  getClosureDetails,
  confirmAccountingClosure,
  getClosureProjects,
} from "../db";
import { TRPCError } from "@trpc/server";

export const accountingClosuresRouter = router({
  /**
   * Get archived projects pending closure
   */
  getPendingProjects: adminProcedure.query(async () => {
    try {
      const projects = await getPendingClosureProjects();
      return projects;
    } catch (error) {
      console.error("[AccountingClosures] Error getting pending projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener proyectos pendientes de cierre",
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
});
