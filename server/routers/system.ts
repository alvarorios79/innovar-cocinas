import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, sql, inArray } from "drizzle-orm";
import { 
  users, 
  clients, 
  projects, 
  quotations, 
  appointments,
  tasks,
  notifications,
  quotationItems,
  appointmentWorkTypes,
  taskReminders,
  projectPhotos,
  projectStatusHistory,
  projectDetails,
  projectMaterials,
  projectHardwareSelections,
  clientRevisionHistory,
  reminders,
  payments,
  expenses,
  priorEstimates,
  advisoryRequests,
  pushSubscriptions
} from "../../drizzle/schema";

/**
 * System Router
 * 
 * Procedures for system-level operations like cleanup
 * Only accessible to super_admin role
 */

/**
 * Get counts of all system data without deleting
 */
export const getSystemDataCounts = protectedProcedure.query(async ({ ctx }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
  }
  
  const db = await getDb();
  if (!db) {
    return {
      clients: 0,
      quotations: 0,
      projects: 0,
      appointments: 0,
      tasks: 0,
    };
  }
  
  try {
    const [clientsData, quotationsData, projectsData, appointmentsData] = await Promise.all([
      db.select({ count: sql`COUNT(*) as count` }).from(clients).where(eq(clients.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(quotations).where(eq(quotations.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(projects).where(eq(projects.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(appointments).where(eq(appointments.dataOrigin, "system")),
    ]);
    
    return {
      clients: clientsData[0]?.count || 0,
      quotations: quotationsData[0]?.count || 0,
      projects: projectsData[0]?.count || 0,
      appointments: appointmentsData[0]?.count || 0,
      tasks: 0, // tasks table doesn't have dataOrigin
    };
  } catch (error) {
    console.error("[getSystemDataCounts] Error:", error);
    return {
      clients: 0,
      quotations: 0,
      projects: 0,
      appointments: 0,
      tasks: 0,
    };
  }
});

export const systemRouter = router({
  /**
   * Get counts of all system data without deleting
   */
  getSystemDataCounts: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    
    const db = await getDb();
    if (!db) {
      return {
        clients: 0,
        quotations: 0,
        projects: 0,
        appointments: 0,
        users: 0,
        tasks: 0,
      };
    }
    
    try {
      const [clientsData, quotationsData, projectsData, appointmentsData] = await Promise.all([
        db.select({ count: sql`COUNT(*) as count` }).from(clients).where(eq(clients.dataOrigin, "system")),
        db.select({ count: sql`COUNT(*) as count` }).from(quotations).where(eq(quotations.dataOrigin, "system")),
        db.select({ count: sql`COUNT(*) as count` }).from(projects).where(eq(projects.dataOrigin, "system")),
        db.select({ count: sql`COUNT(*) as count` }).from(appointments).where(eq(appointments.dataOrigin, "system")),
      ]);
      
      const [usersData] = await Promise.all([
        db.select({ count: sql`COUNT(*) as count` }).from(users).where(eq(users.dataOrigin, "system")),
      ]);
      
      return {
        clients: clientsData[0]?.count || 0,
        quotations: quotationsData[0]?.count || 0,
        projects: projectsData[0]?.count || 0,
        appointments: appointmentsData[0]?.count || 0,
        users: usersData[0]?.count || 0,
        tasks: 0, // tasks table doesn't have dataOrigin
      };
    } catch (error) {
      console.error("[getSystemDataCounts] Error:", error);
      return {
        clients: 0,
        quotations: 0,
        projects: 0,
        appointments: 0,
        users: 0,
        tasks: 0,
      };
    }
  }),
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
   * Get all system users
   */
  getSystemUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(users).where(eq(users.dataOrigin, "system"));
  }),

  /**
   * Delete all system users
   */
  deleteSystemUsers: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo super administradores pueden acceder a la Zona Crítica" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const result = await db.delete(users).where(eq(users.dataOrigin, "system"));
    return {
      success: true,
      message: "Usuarios del sistema eliminados correctamente",
      deletedRecords: { users: result },
      totalDeleted: result,
    };
  }),

  /**
   * cleanupData
   * 
   * Deletes all data created automatically by the system (dataOrigin = 'system')
   * Preserves all manually created data (dataOrigin = 'manual')
   * 
   * Deletion order (respecting foreign key constraints):
   * 1. notifications (references users)
   * 2. taskReminders (references tasks, users)
   * 3. tasks (references users, projects)
   * 4. appointmentWorkTypes (references appointments)
   * 5. quotationItems (references quotations)
   * 6. appointments (references clients)
   * 7. projectPhotos, projectStatusHistory, projectDetails, projectMaterials, projectHardwareSelections, clientRevisionHistory, reminders, payments, expenses (all reference projects)
   * 8. quotations (references clients)
   * 9. projects (references clients)
   * 10. priorEstimates, advisoryRequests (reference clients)
   * 11. pushSubscriptions (references users)
   * 12. clients (references users)
   * 13. users (final step)
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

      const deletedCounts: Record<string, number> = {};

      // Use transaction for data integrity
      // Deletion order respects foreign key constraints
      await db.transaction(async (tx) => {
        console.log("[Cleanup] Starting system data cleanup transaction...");
        console.log("[Cleanup] Will delete records with dataOrigin IN ('system', 'test')");
        
        // Count records before deletion
        const countBefore = await db.select({ count: sql`COUNT(*)` }).from(users).where(inArray(users.dataOrigin, ["system", "test"]));
        console.log("[Cleanup] Users to delete:", countBefore[0]?.count || 0);

        // 1. Delete notifications (references users)
        try {
          const notifResult = await tx.delete(notifications).where(
            sql`${notifications.userId} IN (SELECT id FROM users WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.notifications = Array.isArray(notifResult) ? notifResult.length : (notifResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted notifications:", deletedCounts.notifications);
        } catch (e) {
          console.log("[Cleanup] No notifications to delete or error:", e);
          deletedCounts.notifications = 0;
        }

        // 2. Delete taskReminders (references tasks, users)
        try {
          const taskRemResult = await tx.delete(taskReminders).where(
            sql`${taskReminders.taskId} IN (SELECT id FROM tasks WHERE projectId IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test')))`
          );
          deletedCounts.taskReminders = Array.isArray(taskRemResult) ? taskRemResult.length : (taskRemResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted taskReminders:", deletedCounts.taskReminders);
        } catch (e) {
          console.log("[Cleanup] No taskReminders to delete or error:", e);
          deletedCounts.taskReminders = 0;
        }

        // 3. Delete tasks (references users, projects)
        try {
          const taskResult = await tx.delete(tasks).where(
            sql`${tasks.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.tasks = Array.isArray(taskResult) ? taskResult.length : (taskResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted tasks:", deletedCounts.tasks);
        } catch (e) {
          console.log("[Cleanup] No tasks to delete or error:", e);
          deletedCounts.tasks = 0;
        }

        // 4. Delete appointmentWorkTypes (references appointments)
        try {
          const aptWTResult = await tx.delete(appointmentWorkTypes).where(
            sql`${appointmentWorkTypes.appointmentId} IN (SELECT id FROM appointments WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.appointmentWorkTypes = Array.isArray(aptWTResult) ? aptWTResult.length : (aptWTResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted appointmentWorkTypes:", deletedCounts.appointmentWorkTypes);
        } catch (e) {
          console.log("[Cleanup] No appointmentWorkTypes to delete or error:", e);
          deletedCounts.appointmentWorkTypes = 0;
        }

        // 5. Delete quotationItems (references quotations)
        try {
          const quotItemResult = await tx.delete(quotationItems).where(
            sql`${quotationItems.quotationId} IN (SELECT id FROM quotations WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.quotationItems = Array.isArray(quotItemResult) ? quotItemResult.length : (quotItemResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted quotationItems:", deletedCounts.quotationItems);
        } catch (e) {
          console.log("[Cleanup] No quotationItems to delete or error:", e);
          deletedCounts.quotationItems = 0;
        }

        // 6. Delete appointments (references clients)
        try {
          const aptResult = await tx.delete(appointments).where(inArray(appointments.dataOrigin, ["system", "test"]));
          deletedCounts.appointments = Array.isArray(aptResult) ? aptResult.length : (aptResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted appointments:", deletedCounts.appointments);
        } catch (e) {
          console.log("[Cleanup] No appointments to delete or error:", e);
          deletedCounts.appointments = 0;
        }

        // 7. Delete project-related records (all reference projects)
        try {
          const projPhotoResult = await tx.delete(projectPhotos).where(
            sql`${projectPhotos.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.projectPhotos = Array.isArray(projPhotoResult) ? projPhotoResult.length : (projPhotoResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted projectPhotos:", deletedCounts.projectPhotos);
        } catch (e) {
          console.log("[Cleanup] No projectPhotos to delete or error:", e);
          deletedCounts.projectPhotos = 0;
        }

        try {
          const projStatusResult = await tx.delete(projectStatusHistory).where(
            sql`${projectStatusHistory.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.projectStatusHistory = Array.isArray(projStatusResult) ? projStatusResult.length : (projStatusResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted projectStatusHistory:", deletedCounts.projectStatusHistory);
        } catch (e) {
          console.log("[Cleanup] No projectStatusHistory to delete or error:", e);
          deletedCounts.projectStatusHistory = 0;
        }

        try {
          const projDetailResult = await tx.delete(projectDetails).where(
            sql`${projectDetails.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.projectDetails = Array.isArray(projDetailResult) ? projDetailResult.length : (projDetailResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted projectDetails:", deletedCounts.projectDetails);
        } catch (e) {
          console.log("[Cleanup] No projectDetails to delete or error:", e);
          deletedCounts.projectDetails = 0;
        }

        try {
          const projMatResult = await tx.delete(projectMaterials).where(
            sql`${projectMaterials.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.projectMaterials = Array.isArray(projMatResult) ? projMatResult.length : (projMatResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted projectMaterials:", deletedCounts.projectMaterials);
        } catch (e) {
          console.log("[Cleanup] No projectMaterials to delete or error:", e);
          deletedCounts.projectMaterials = 0;
        }

        try {
          const projHWResult = await tx.delete(projectHardwareSelections).where(
            sql`${projectHardwareSelections.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.projectHardwareSelections = Array.isArray(projHWResult) ? projHWResult.length : (projHWResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted projectHardwareSelections:", deletedCounts.projectHardwareSelections);
        } catch (e) {
          console.log("[Cleanup] No projectHardwareSelections to delete or error:", e);
          deletedCounts.projectHardwareSelections = 0;
        }

        try {
          const clientRevResult = await tx.delete(clientRevisionHistory).where(
            sql`${clientRevisionHistory.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.clientRevisionHistory = Array.isArray(clientRevResult) ? clientRevResult.length : (clientRevResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted clientRevisionHistory:", deletedCounts.clientRevisionHistory);
        } catch (e) {
          console.log("[Cleanup] No clientRevisionHistory to delete or error:", e);
          deletedCounts.clientRevisionHistory = 0;
        }

        try {
          const reminderResult = await tx.delete(reminders).where(
            sql`${reminders.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.reminders = Array.isArray(reminderResult) ? reminderResult.length : (reminderResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted reminders:", deletedCounts.reminders);
        } catch (e) {
          console.log("[Cleanup] No reminders to delete or error:", e);
          deletedCounts.reminders = 0;
        }

        try {
          const paymentResult = await tx.delete(payments).where(
            sql`${payments.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.payments = Array.isArray(paymentResult) ? paymentResult.length : (paymentResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted payments:", deletedCounts.payments);
        } catch (e) {
          console.log("[Cleanup] No payments to delete or error:", e);
          deletedCounts.payments = 0;
        }

        try {
          const expenseResult = await tx.delete(expenses).where(
            sql`${expenses.projectId} IN (SELECT id FROM projects WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.expenses = Array.isArray(expenseResult) ? expenseResult.length : (expenseResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted expenses:", deletedCounts.expenses);
        } catch (e) {
          console.log("[Cleanup] No expenses to delete or error:", e);
          deletedCounts.expenses = 0;
        }

        // 8. Delete quotations (references clients)
        try {
          const quotResult = await tx.delete(quotations).where(inArray(quotations.dataOrigin, ["system", "test"]));
          deletedCounts.quotations = Array.isArray(quotResult) ? quotResult.length : (quotResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted quotations:", deletedCounts.quotations);
        } catch (e) {
          console.log("[Cleanup] No quotations to delete or error:", e);
          deletedCounts.quotations = 0;
        }

        // 9. Delete projects (references clients)
        try {
          const projResult = await tx.delete(projects).where(inArray(projects.dataOrigin, ["system", "test"]));
          deletedCounts.projects = Array.isArray(projResult) ? projResult.length : (projResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted projects:", deletedCounts.projects);
        } catch (e) {
          console.log("[Cleanup] No projects to delete or error:", e);
          deletedCounts.projects = 0;
        }

        // 10. Delete client-related records
        try {
          const priorEstResult = await tx.delete(priorEstimates).where(
            sql`${priorEstimates.clientId} IN (SELECT id FROM clients WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.priorEstimates = Array.isArray(priorEstResult) ? priorEstResult.length : (priorEstResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted priorEstimates:", deletedCounts.priorEstimates);
        } catch (e) {
          console.log("[Cleanup] No priorEstimates to delete or error:", e);
          deletedCounts.priorEstimates = 0;
        }

        try {
          const advisoryResult = await tx.delete(advisoryRequests).where(
            sql`${advisoryRequests.clientId} IN (SELECT id FROM clients WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.advisoryRequests = Array.isArray(advisoryResult) ? advisoryResult.length : (advisoryResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted advisoryRequests:", deletedCounts.advisoryRequests);
        } catch (e) {
          console.log("[Cleanup] No advisoryRequests to delete or error:", e);
          deletedCounts.advisoryRequests = 0;
        }

        // 11. Delete pushSubscriptions (references users)
        try {
          const pushResult = await tx.delete(pushSubscriptions).where(
            sql`${pushSubscriptions.userId} IN (SELECT id FROM users WHERE dataOrigin IN ('system', 'test'))`
          );
          deletedCounts.pushSubscriptions = Array.isArray(pushResult) ? pushResult.length : (pushResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted pushSubscriptions:", deletedCounts.pushSubscriptions);
        } catch (e) {
          console.log("[Cleanup] No pushSubscriptions to delete or error:", e);
          deletedCounts.pushSubscriptions = 0;
        }

        // 12. Delete clients (references users)
        try {
          const clientResult = await tx.delete(clients).where(inArray(clients.dataOrigin, ["system", "test"]));
          deletedCounts.clients = Array.isArray(clientResult) ? clientResult.length : (clientResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted clients:", deletedCounts.clients);
        } catch (e) {
          console.log("[Cleanup] No clients to delete or error:", e);
          deletedCounts.clients = 0;
        }

        // 13. Delete users (final step)
        try {
          const userResult = await tx.delete(users).where(inArray(users.dataOrigin, ["system", "test"]));
          deletedCounts.users = Array.isArray(userResult) ? userResult.length : (userResult as any)?.affectedRows || 0;
          console.log("[Cleanup] Deleted users:", deletedCounts.users);
        } catch (e) {
          console.log("[Cleanup] No users to delete or error:", e);
          deletedCounts.users = 0;
        }

        console.log("[Cleanup] Transaction completed successfully");
      });

      console.log("[Cleanup] Final deletion counts:", deletedCounts);

      const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);

      return {
        success: true,
        message: "Limpieza del sistema completada correctamente",
        deletedRecords: deletedCounts,
        totalDeleted,
      };
    } catch (error) {
      console.error("Error during system cleanup:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to execute system cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error,
      });
    }
  }),
});
