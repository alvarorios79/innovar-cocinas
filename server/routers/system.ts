import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { 
  users, 
  clients, 
  projects, 
  quotations, 
  appointments
} from "../../drizzle/schema";

/**
 * System Router
 * 
 * Procedures for system-level operations like cleanup
 * Only accessible to super_admin role
 */

export const systemRouter = router({
  /**
   * Get all system clients
   */
  getSystemClients: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(clients).where(eq(clients.dataOrigin, "system"));
  }),

  /**
   * Get all system quotations
   */
  getSystemQuotations: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(quotations).where(eq(quotations.dataOrigin, "system"));
  }),

  /**
   * Get all system projects
   */
  getSystemProjects: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(projects).where(eq(projects.dataOrigin, "system"));
  }),

  /**
   * Get all system appointments
   */
  getSystemAppointments: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(appointments).where(eq(appointments.dataOrigin, "system"));
  }),

  /**
   * Delete all system clients
   */
  deleteSystemClients: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const result = await db.delete(clients).where(eq(clients.dataOrigin, "system"));
    return {
      success: true,
      message: "Clientes del sistema eliminados correctamente",
      deletedRecords: { clients: result },
      totalDeleted: result,
    };
  }),

  /**
   * Delete all system quotations
   */
  deleteSystemQuotations: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const result = await db.delete(quotations).where(eq(quotations.dataOrigin, "system"));
    return {
      success: true,
      message: "Cotizaciones del sistema eliminadas correctamente",
      deletedRecords: { quotations: result },
      totalDeleted: result,
    };
  }),

  /**
   * Delete all system projects
   */
  deleteSystemProjects: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const result = await db.delete(projects).where(eq(projects.dataOrigin, "system"));
    return {
      success: true,
      message: "Proyectos del sistema eliminados correctamente",
      deletedRecords: { projects: result },
      totalDeleted: result,
    };
  }),

  /**
   * Delete all system appointments
   */
  deleteSystemAppointments: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const result = await db.delete(appointments).where(eq(appointments.dataOrigin, "system"));
    return {
      success: true,
      message: "Citas del sistema eliminadas correctamente",
      deletedRecords: { appointments: result },
      totalDeleted: result,
    };
  }),

  /**
   * cleanupData
   * 
   * Deletes all data created automatically by the system (dataOrigin = 'system')
   * Preserves all manually created data (dataOrigin = 'manual')
   * 
   * Deletion order (respecting foreign keys):
   * 1. appointments
   * 2. quotations
   * 3. projects
   * 4. clients
   * 5. users
   * 
   * Returns count of deleted records per table
   */
  cleanupData: protectedProcedure.mutation(async ({ ctx }) => {
    // Only super_admin can execute cleanup
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super_admin can execute system cleanup",
      });
    }

    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      let appointmentsDeleted = 0;
      let quotationsDeleted = 0;
      let projectsDeleted = 0;
      let clientsDeleted = 0;
      let usersDeleted = 0;

      // Use transaction for data integrity
      // Deletion order respects foreign key constraints
      await db.transaction(async (tx) => {
        // 1. Delete appointments with dataOrigin = 'system'
        const appointmentResult = await tx
          .delete(appointments)
          .where(eq(appointments.dataOrigin, "system"));
        console.log("[Cleanup] appointmentResult:", appointmentResult);
        appointmentsDeleted = appointmentResult?.[0]?.affectedRows || 0;

        // 2. Delete quotations with dataOrigin = 'system'
        const quotationResult = await tx
          .delete(quotations)
          .where(eq(quotations.dataOrigin, "system"));
        console.log("[Cleanup] quotationResult:", quotationResult);
        quotationsDeleted = quotationResult?.[0]?.affectedRows || 0;

        // 3. Delete projects with dataOrigin = 'system'
        const projectResult = await tx
          .delete(projects)
          .where(eq(projects.dataOrigin, "system"));
        console.log("[Cleanup] projectResult:", projectResult);
        projectsDeleted = projectResult?.[0]?.affectedRows || 0;

        // 4. Delete clients with dataOrigin = 'system'
        const clientResult = await tx
          .delete(clients)
          .where(eq(clients.dataOrigin, "system"));
        console.log("[Cleanup] clientResult:", clientResult);
        clientsDeleted = clientResult?.[0]?.affectedRows || 0;

        // 5. Delete users with dataOrigin = 'system'
        const userResult = await tx
          .delete(users)
          .where(eq(users.dataOrigin, "system"));
        console.log("[Cleanup] userResult:", userResult);
        usersDeleted = userResult?.[0]?.affectedRows || 0;
      });

      console.log("[Cleanup] Final results:", {
        appointmentsDeleted,
        quotationsDeleted,
        projectsDeleted,
        clientsDeleted,
        usersDeleted,
      });

      return {
        success: true,
        message: "Limpieza del sistema completada correctamente",
        deletedRecords: {
          appointmentsDeleted,
          quotationsDeleted,
          projectsDeleted,
          clientsDeleted,
          usersDeleted,
        },
        totalDeleted:
          appointmentsDeleted +
          quotationsDeleted +
          projectsDeleted +
          clientsDeleted +
          usersDeleted,
      };
    } catch (error) {
      console.error("Error during system cleanup:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to execute system cleanup",
        cause: error,
      });
    }
  }),
});
