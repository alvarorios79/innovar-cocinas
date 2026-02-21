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
        appointmentsDeleted = appointmentResult[0].affectedRows || 0;

        // 2. Delete quotations with dataOrigin = 'system'
        const quotationResult = await tx
          .delete(quotations)
          .where(eq(quotations.dataOrigin, "system"));
        quotationsDeleted = quotationResult[0].affectedRows || 0;

        // 3. Delete projects with dataOrigin = 'system'
        const projectResult = await tx
          .delete(projects)
          .where(eq(projects.dataOrigin, "system"));
        projectsDeleted = projectResult[0].affectedRows || 0;

        // 4. Delete clients with dataOrigin = 'system'
        const clientResult = await tx
          .delete(clients)
          .where(eq(clients.dataOrigin, "system"));
        clientsDeleted = clientResult[0].affectedRows || 0;

        // 5. Delete users with dataOrigin = 'system'
        const userResult = await tx
          .delete(users)
          .where(eq(users.dataOrigin, "system"));
        usersDeleted = userResult[0].affectedRows || 0;
      });

      return {
        success: true,
        message: "System cleanup completed successfully",
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
