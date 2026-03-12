import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const dataProtectionRouter = router({
  // ============ RECYCLE BIN - GET DELETED RECORDS ============

  getDeletedClients: protectedProcedure
    .query(async () => {
      return await db.getDeletedClients();
    }),

  getDeletedProjects: protectedProcedure
    .query(async () => {
      return await db.getDeletedProjects();
    }),

  getDeletedQuotations: protectedProcedure
    .query(async () => {
      return await db.getDeletedQuotations();
    }),

  getDeletedAppointments: protectedProcedure
    .query(async () => {
      return await db.getDeletedAppointments();
    }),

  getDeletedTasks: protectedProcedure
    .query(async () => {
      return await db.getDeletedTasks();
    }),

  getDeletedExpenses: protectedProcedure
    .query(async () => {
      return await db.getDeletedExpenses();
    }),

  // ============ RECYCLE BIN - RESTORE RECORDS ============

  restoreClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.restoreClient(input.clientId, ctx.user.id);
        return { success: true, message: "Cliente restaurado exitosamente" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al restaurar cliente",
        });
      }
    }),

  restoreProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.restoreProject(input.projectId, ctx.user.id);
        return { success: true, message: "Proyecto restaurado exitosamente" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al restaurar proyecto",
        });
      }
    }),

  restoreQuotation: protectedProcedure
    .input(z.object({ quotationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.restoreQuotation(input.quotationId, ctx.user.id);
        return { success: true, message: "Cotización restaurada exitosamente" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al restaurar cotización",
        });
      }
    }),

  restoreAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.restoreAppointment(input.appointmentId, ctx.user.id);
        return { success: true, message: "Cita restaurada exitosamente" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al restaurar cita",
        });
      }
    }),

  restoreTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.restoreTask(input.taskId, ctx.user.id);
        return { success: true, message: "Tarea restaurada exitosamente" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al restaurar tarea",
        });
      }
    }),

  restoreExpense: protectedProcedure
    .input(z.object({ expenseId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.restoreExpense(input.expenseId, ctx.user.id);
        return { success: true, message: "Gasto restaurado exitosamente" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al restaurar gasto",
        });
      }
    }),

  // ============ AUDIT LOG ============

  getAuditLogs: protectedProcedure
    .input(z.object({
      tableName: z.string().optional(),
      recordId: z.number().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input, ctx }) => {
      // Only admins can view full audit logs
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        // Regular users can only see audit logs for their own actions
        return await db.getAuditLogsByUser(ctx.user.id);
      }

      if (input.tableName && input.recordId) {
        return await db.getAuditLogsForRecord(input.tableName, input.recordId);
      }

      return await db.getAuditLogsByUser(ctx.user.id);
    }),

  // ============ ADMIN ONLY - PERMANENT DELETE ============

  permanentlyDeleteRecord: protectedProcedure
    .input(z.object({
      tableName: z.enum(["clients", "projects", "quotations", "appointments", "tasks", "expenses"]),
      recordId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only super_admin can permanently delete records
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo super administradores pueden eliminar registros permanentemente",
        });
      }

      try {
        await db.permanentlyDeleteRecord(input.tableName, input.recordId);
        return { success: true, message: "Registro eliminado permanentemente" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al eliminar registro",
        });
      }
    }),

  // ============ ADMIN ONLY - EMPTY RECYCLE BIN ============

  emptyRecycleBin: protectedProcedure
    .input(z.object({
      daysOld: z.number().default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only super_admin can empty recycle bin
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo super administradores pueden vaciar la papelera",
        });
      }

      try {
        await db.emptyRecycleBin();
        return {
          success: true,
          message: "Papelera vaciada: registros eliminados permanentemente",
          totalDeleted: 0,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al vaciar papelera",
        });
      }
    }),
});
