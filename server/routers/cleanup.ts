import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  users,
  clients,
  projects,
  quotations,
  appointments,
  tasks,
  notifications,
  expenses,
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
  priorEstimates,
  advisoryRequests,
  pushSubscriptions,
  closureAuditLog,
} from "../../drizzle/schema";

const TABLE_NAMES = {
  users: "users",
  clients: "clients",
  projects: "projects",
  quotations: "quotations",
  appointments: "appointments",
  tasks: "tasks",
  notifications: "notifications",
  expenses: "expenses",
} as const;

/**
 * Get counts of system-generated records by table
 */
const getSystemRecordCounts = async (db: any) => {
  try {
    const counts = await Promise.all([
      db.select({ count: sql`COUNT(*) as count` }).from(users).where(eq(users.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(clients).where(eq(clients.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(projects).where(eq(projects.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(quotations).where(eq(quotations.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(appointments).where(eq(appointments.dataOrigin, "system")),
      db.select({ count: sql`COUNT(*) as count` }).from(tasks).where(
        sql`${tasks.projectId} IN (SELECT id FROM projects WHERE dataOrigin = 'system')`
      ),
      db.select({ count: sql`COUNT(*) as count` }).from(notifications).where(
        sql`${notifications.userId} IN (SELECT id FROM users WHERE dataOrigin = 'system')`
      ),
      db.select({ count: sql`COUNT(*) as count` }).from(expenses).where(
        sql`${expenses.dataOrigin} IN ('system', 'test')`
      ),
    ]);

    return {
      [TABLE_NAMES.users]: counts[0][0]?.count || 0,
      [TABLE_NAMES.clients]: counts[1][0]?.count || 0,
      [TABLE_NAMES.projects]: counts[2][0]?.count || 0,
      [TABLE_NAMES.quotations]: counts[3][0]?.count || 0,
      [TABLE_NAMES.appointments]: counts[4][0]?.count || 0,
      [TABLE_NAMES.tasks]: counts[5][0]?.count || 0,
      [TABLE_NAMES.notifications]: counts[6][0]?.count || 0,
      [TABLE_NAMES.expenses]: counts[7][0]?.count || 0,
    };
  } catch (error) {
    console.error("[getSystemRecordCounts] Error:", error);
    return {
      [TABLE_NAMES.users]: 0,
      [TABLE_NAMES.clients]: 0,
      [TABLE_NAMES.projects]: 0,
      [TABLE_NAMES.quotations]: 0,
      [TABLE_NAMES.appointments]: 0,
      [TABLE_NAMES.tasks]: 0,
      [TABLE_NAMES.notifications]: 0,
      [TABLE_NAMES.expenses]: 0,
    };
  }
};

/**
 * Get paginated list of system records for a specific table
 */
const getSystemRecordsByTable = async (
  db: any,
  tableName: string,
  page: number = 1,
  pageSize: number = 50
) => {
  const offset = (page - 1) * pageSize;

  try {
    let query: any;
    let countQuery: any;
    let records: any[] = [];
    let totalCount = 0;

    switch (tableName) {
      case TABLE_NAMES.users:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(users)
          .where(eq(users.dataOrigin, "system"));
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(users)
          .where(eq(users.dataOrigin, "system"))
          .limit(pageSize)
          .offset(offset);
        break;

      case TABLE_NAMES.clients:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(clients)
          .where(eq(clients.dataOrigin, "system"));
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(clients)
          .where(eq(clients.dataOrigin, "system"))
          .limit(pageSize)
          .offset(offset);
        break;

      case TABLE_NAMES.projects:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(projects)
          .where(eq(projects.dataOrigin, "system"));
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(projects)
          .where(eq(projects.dataOrigin, "system"))
          .limit(pageSize)
          .offset(offset);
        break;

      case TABLE_NAMES.quotations:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(quotations)
          .where(eq(quotations.dataOrigin, "system"));
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(quotations)
          .where(eq(quotations.dataOrigin, "system"))
          .limit(pageSize)
          .offset(offset);
        break;

      case TABLE_NAMES.appointments:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(appointments)
          .where(eq(appointments.dataOrigin, "system"));
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(appointments)
          .where(eq(appointments.dataOrigin, "system"))
          .limit(pageSize)
          .offset(offset);
        break;

      case TABLE_NAMES.tasks:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(tasks)
          .where(sql`${tasks.projectId} IN (SELECT id FROM projects WHERE dataOrigin = 'system')`);
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(tasks)
          .where(sql`${tasks.projectId} IN (SELECT id FROM projects WHERE dataOrigin = 'system')`)
          .limit(pageSize)
          .offset(offset);
        break;

      case TABLE_NAMES.notifications:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(notifications)
          .where(sql`${notifications.userId} IN (SELECT id FROM users WHERE dataOrigin = 'system')`);
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(notifications)
          .where(sql`${notifications.userId} IN (SELECT id FROM users WHERE dataOrigin = 'system')`)
          .limit(pageSize)
          .offset(offset);
        break;

      case TABLE_NAMES.expenses:
        countQuery = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(expenses)
          .where(sql`${expenses.dataOrigin} IN ('system', 'test')`);
        totalCount = countQuery[0]?.count || 0;
        records = await db
          .select()
          .from(expenses)
          .where(sql`${expenses.dataOrigin} IN ('system', 'test')`)
          .limit(pageSize)
          .offset(offset);
        break;

      default:
        throw new Error(`Unknown table: ${tableName}`);
    }

    return {
      records,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (error) {
    console.error(`[getSystemRecordsByTable] Error for table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Delete individual records by ID
 */
const deleteRecordsByIds = async (db: any, tableName: string, ids: number[]) => {
  if (!ids || ids.length === 0) return 0;

  try {
    let result: any;

    switch (tableName) {
      case TABLE_NAMES.users:
        result = await db.delete(users).where(inArray(users.id, ids));
        break;
      case TABLE_NAMES.clients:
        result = await db.delete(clients).where(inArray(clients.id, ids));
        break;
      case TABLE_NAMES.projects:
        result = await db.delete(projects).where(inArray(projects.id, ids));
        break;
      case TABLE_NAMES.quotations:
        result = await db.delete(quotations).where(inArray(quotations.id, ids));
        break;
      case TABLE_NAMES.appointments:
        result = await db.delete(appointments).where(inArray(appointments.id, ids));
        break;
      case TABLE_NAMES.tasks:
        result = await db.delete(tasks).where(inArray(tasks.id, ids));
        break;
      case TABLE_NAMES.notifications:
        result = await db.delete(notifications).where(inArray(notifications.id, ids));
        break;
      case TABLE_NAMES.expenses:
        result = await db.delete(expenses).where(inArray(expenses.id, ids));
        break;
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }

    return Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
  } catch (error) {
    console.error(`[deleteRecordsByIds] Error for table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Log cleanup operation to audit trail
 */
const logCleanupOperation = async (
  db: any,
  tableName: string,
  recordsDeleted: number,
  executedBy: number,
  sessionId: string,
  details?: Record<string, any>
) => {
  try {
    await db.insert(closureAuditLog).values({
      tableName,
      recordsDeleted,
      executedBy,
      cleanupSessionId: sessionId,
      details: details || {},
    });
  } catch (error) {
    console.error("[logCleanupOperation] Error:", error);
    // Don't throw - audit logging failure shouldn't block cleanup
  }
};

export const cleanupRouter = router({
  /**
   * Get counts of all system-generated records
   */
  getSystemRecordCounts: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solo super administradores pueden acceder a LIMPIEZA DE SISTEMA",
      });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Base de datos no disponible",
      });
    }

    return await getSystemRecordCounts(db);
  }),

  /**
   * Get paginated list of system records for a specific table
   */
  getSystemRecordsByTable: protectedProcedure
    .input(
      z.object({
        tableName: z.enum([
          "users",
          "clients",
          "projects",
          "quotations",
          "appointments",
          "tasks",
          "notifications",
          "expenses",
        ]),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo super administradores pueden acceder a LIMPIEZA DE SISTEMA",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      return await getSystemRecordsByTable(db, input.tableName, input.page, input.pageSize);
    }),

  /**
   * Delete individual records by IDs
   */
  deleteRecords: protectedProcedure
    .input(
      z.object({
        tableName: z.enum([
          "users",
          "clients",
          "projects",
          "quotations",
          "appointments",
          "tasks",
          "notifications",
          "expenses",
        ]),
        ids: z.array(z.number().int()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo super administradores pueden ejecutar limpieza",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      try {
        const sessionId = randomUUID();
        const deletedCount = await deleteRecordsByIds(db, input.tableName, input.ids);

        // Log the operation
        await logCleanupOperation(db, input.tableName, deletedCount, ctx.user.id, sessionId, {
          recordIds: input.ids,
        });

        return {
          success: true,
          deletedCount,
          message: `${deletedCount} registros eliminados de ${input.tableName}`,
        };
      } catch (error) {
        console.error("[deleteRecords] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al eliminar registros: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete all system records from a specific table
   */
  deleteAllFromTable: protectedProcedure
    .input(
      z.object({
        tableName: z.enum([
          "users",
          "clients",
          "projects",
          "quotations",
          "appointments",
          "tasks",
          "notifications",
          "expenses",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo super administradores pueden ejecutar limpieza",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      try {
        const sessionId = randomUUID();
        let deletedCount = 0;

        await db.transaction(async (tx: any) => {
          // Get all IDs first
          let allIds: number[] = [];

          if (input.tableName === TABLE_NAMES.users) {
            const records = await tx.select({ id: users.id }).from(users).where(eq(users.dataOrigin, "system"));
            allIds = records.map((r: any) => r.id);
          } else if (input.tableName === TABLE_NAMES.clients) {
            const records = await tx.select({ id: clients.id }).from(clients).where(eq(clients.dataOrigin, "system"));
            allIds = records.map((r: any) => r.id);
          } else if (input.tableName === TABLE_NAMES.projects) {
            const records = await tx.select({ id: projects.id }).from(projects).where(eq(projects.dataOrigin, "system"));
            allIds = records.map((r: any) => r.id);
          } else if (input.tableName === TABLE_NAMES.quotations) {
            const records = await tx.select({ id: quotations.id }).from(quotations).where(eq(quotations.dataOrigin, "system"));
            allIds = records.map((r: any) => r.id);
          } else if (input.tableName === TABLE_NAMES.appointments) {
            const records = await tx.select({ id: appointments.id }).from(appointments).where(eq(appointments.dataOrigin, "system"));
            allIds = records.map((r: any) => r.id);
          } else if (input.tableName === TABLE_NAMES.tasks) {
            const records = await tx
              .select({ id: tasks.id })
              .from(tasks)
              .where(sql`${tasks.projectId} IN (SELECT id FROM projects WHERE dataOrigin = 'system')`);
            allIds = records.map((r: any) => r.id);
          } else if (input.tableName === TABLE_NAMES.notifications) {
            const records = await tx
              .select({ id: notifications.id })
              .from(notifications)
              .where(sql`${notifications.userId} IN (SELECT id FROM users WHERE dataOrigin = 'system')`);
            allIds = records.map((r: any) => r.id);
          } else if (input.tableName === TABLE_NAMES.expenses) {
            const records = await tx
              .select({ id: expenses.id })
              .from(expenses)
              .where(sql`${expenses.projectId} IN (SELECT id FROM projects WHERE dataOrigin = 'system')`);
            allIds = records.map((r: any) => r.id);
          }

          if (allIds.length > 0) {
            deletedCount = await deleteRecordsByIds(tx, input.tableName, allIds);
          }
        });

        // Log the operation
        await logCleanupOperation(db, input.tableName, deletedCount, ctx.user.id, sessionId);

        return {
          success: true,
          deletedCount,
          message: `Todos los ${deletedCount} registros de ${input.tableName} han sido eliminados`,
        };
      } catch (error) {
        console.error("[deleteAllFromTable] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al eliminar registros: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete all system-generated data in correct dependency order
   */
  deleteAllSystemData: protectedProcedure
    .input(
      z.object({
        confirmation: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo super administradores pueden ejecutar limpieza global",
        });
      }

      if (input.confirmation !== "ELIMINAR DATOS DE PRUEBA") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmación incorrecta. Escriba: ELIMINAR DATOS DE PRUEBA",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      try {
        const sessionId = randomUUID();
        const deletedCounts: Record<string, number> = {};

        await db.transaction(async (tx: any) => {
          console.log("[deleteAllSystemData] Starting system data cleanup transaction...");

          // 1. Delete notifications (references users)
          try {
            const result = await tx.delete(notifications).where(
              sql`${notifications.userId} IN (SELECT id FROM users WHERE dataOrigin = 'system')`
            );
            deletedCounts.notifications = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted notifications:", deletedCounts.notifications);
          } catch (e) {
            console.log("[Cleanup] No notifications to delete or error:", e);
            deletedCounts.notifications = 0;
          }

          // 2. Delete taskReminders (references tasks)
          try {
            const result = await tx.delete(taskReminders).where(
              sql`${taskReminders.taskId} IN (SELECT id FROM tasks WHERE projectId IN (SELECT id FROM projects WHERE dataOrigin = 'system'))`
            );
            deletedCounts.taskReminders = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted taskReminders:", deletedCounts.taskReminders);
          } catch (e) {
            console.log("[Cleanup] No taskReminders to delete or error:", e);
            deletedCounts.taskReminders = 0;
          }

          // 3. Delete tasks (references projects)
          try {
            const result = await tx.delete(tasks).where(
              sql`${tasks.projectId} IN (SELECT id FROM projects WHERE dataOrigin = 'system')`
            );
            deletedCounts.tasks = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted tasks:", deletedCounts.tasks);
          } catch (e) {
            console.log("[Cleanup] No tasks to delete or error:", e);
            deletedCounts.tasks = 0;
          }

          // 4. Delete appointmentWorkTypes (references appointments)
          try {
            const result = await tx.delete(appointmentWorkTypes).where(
              sql`${appointmentWorkTypes.appointmentId} IN (SELECT id FROM appointments WHERE dataOrigin = 'system')`
            );
            deletedCounts.appointmentWorkTypes = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted appointmentWorkTypes:", deletedCounts.appointmentWorkTypes);
          } catch (e) {
            console.log("[Cleanup] No appointmentWorkTypes to delete or error:", e);
            deletedCounts.appointmentWorkTypes = 0;
          }

          // 5. Delete quotationItems (references quotations)
          try {
            const result = await tx.delete(quotationItems).where(
              sql`${quotationItems.quotationId} IN (SELECT id FROM quotations WHERE dataOrigin = 'system')`
            );
            deletedCounts.quotationItems = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted quotationItems:", deletedCounts.quotationItems);
          } catch (e) {
            console.log("[Cleanup] No quotationItems to delete or error:", e);
            deletedCounts.quotationItems = 0;
          }

          // 6. Delete appointments (references clients)
          try {
            const result = await tx.delete(appointments).where(eq(appointments.dataOrigin, "system"));
            deletedCounts.appointments = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted appointments:", deletedCounts.appointments);
          } catch (e) {
            console.log("[Cleanup] No appointments to delete or error:", e);
            deletedCounts.appointments = 0;
          }

          // 7. Delete project-related records
          const projectRelatedTables = [
            { name: "projectPhotos", table: projectPhotos },
            { name: "projectStatusHistory", table: projectStatusHistory },
            { name: "projectDetails", table: projectDetails },
            { name: "projectMaterials", table: projectMaterials },
            { name: "projectHardwareSelections", table: projectHardwareSelections },
            { name: "clientRevisionHistory", table: clientRevisionHistory },
            { name: "reminders", table: reminders },
            { name: "payments", table: payments },
            { name: "expenses", table: expenses },
          ];

          for (const { name, table } of projectRelatedTables) {
            try {
              const result = await tx.delete(table).where(
                sql`${table.projectId} IN (SELECT id FROM projects WHERE dataOrigin = 'system')`
              );
              deletedCounts[name] = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
              console.log(`[Cleanup] Deleted ${name}:`, deletedCounts[name]);
            } catch (e) {
              console.log(`[Cleanup] No ${name} to delete or error:`, e);
              deletedCounts[name] = 0;
            }
          }

          // 8. Delete quotations (references clients)
          try {
            const result = await tx.delete(quotations).where(eq(quotations.dataOrigin, "system"));
            deletedCounts.quotations = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted quotations:", deletedCounts.quotations);
          } catch (e) {
            console.log("[Cleanup] No quotations to delete or error:", e);
            deletedCounts.quotations = 0;
          }

          // 9. Delete projects (references clients)
          try {
            const result = await tx.delete(projects).where(eq(projects.dataOrigin, "system"));
            deletedCounts.projects = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted projects:", deletedCounts.projects);
          } catch (e) {
            console.log("[Cleanup] No projects to delete or error:", e);
            deletedCounts.projects = 0;
          }

          // 10. Delete client-related records
          try {
            const result = await tx.delete(priorEstimates).where(
              sql`${priorEstimates.clientId} IN (SELECT id FROM clients WHERE dataOrigin = 'system')`
            );
            deletedCounts.priorEstimates = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted priorEstimates:", deletedCounts.priorEstimates);
          } catch (e) {
            console.log("[Cleanup] No priorEstimates to delete or error:", e);
            deletedCounts.priorEstimates = 0;
          }

          try {
            const result = await tx.delete(advisoryRequests).where(
              sql`${advisoryRequests.clientId} IN (SELECT id FROM clients WHERE dataOrigin = 'system')`
            );
            deletedCounts.advisoryRequests = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted advisoryRequests:", deletedCounts.advisoryRequests);
          } catch (e) {
            console.log("[Cleanup] No advisoryRequests to delete or error:", e);
            deletedCounts.advisoryRequests = 0;
          }

          // 11. Delete pushSubscriptions (references users)
          try {
            const result = await tx.delete(pushSubscriptions).where(
              sql`${pushSubscriptions.userId} IN (SELECT id FROM users WHERE dataOrigin = 'system')`
            );
            deletedCounts.pushSubscriptions = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted pushSubscriptions:", deletedCounts.pushSubscriptions);
          } catch (e) {
            console.log("[Cleanup] No pushSubscriptions to delete or error:", e);
            deletedCounts.pushSubscriptions = 0;
          }

          // 12. Delete clients (references users)
          try {
            const result = await tx.delete(clients).where(eq(clients.dataOrigin, "system"));
            deletedCounts.clients = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted clients:", deletedCounts.clients);
          } catch (e) {
            console.log("[Cleanup] No clients to delete or error:", e);
            deletedCounts.clients = 0;
          }

          // 13. Delete users (final step)
          try {
            const result = await tx.delete(users).where(eq(users.dataOrigin, "system"));
            deletedCounts.users = Array.isArray(result) ? result.length : (result as any)?.affectedRows || 0;
            console.log("[Cleanup] Deleted users:", deletedCounts.users);
          } catch (e) {
            console.log("[Cleanup] No users to delete or error:", e);
            deletedCounts.users = 0;
          }

          console.log("[Cleanup] Transaction completed successfully");
        });

        // Log all operations
        for (const [tableName, count] of Object.entries(deletedCounts)) {
          if (count > 0) {
            await logCleanupOperation(db, tableName, count, ctx.user.id, sessionId);
          }
        }

        const totalDeleted = Object.values(deletedCounts).reduce((sum: number, count) => sum + (typeof count === "number" ? count : 0), 0);

        console.log("[Cleanup] Final deletion counts:", deletedCounts);

        return {
          success: true,
          message: "Limpieza del sistema completada correctamente",
          deletedRecords: deletedCounts,
          totalDeleted,
          sessionId,
        };
      } catch (error) {
        console.error("[deleteAllSystemData] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al ejecutar limpieza: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error,
        });
      }
    }),

  /**
   * Get cleanup audit log
   */
  getAuditLog: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo super administradores pueden ver el registro de auditoría",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      try {
        const offset = (input.page - 1) * input.pageSize;

        const [logs, countResult] = await Promise.all([
          db
            .select()
            .from(closureAuditLog)
            .orderBy(sql`${closureAuditLog.timestamp} DESC`)
            .limit(input.pageSize)
            .offset(offset),
          db.select({ count: sql`COUNT(*) as count` }).from(closureAuditLog),
        ]);

        const totalCount = (countResult[0]?.count as number) || 0;

        return {
          logs,
          totalCount,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(totalCount / input.pageSize),
        };
      } catch (error) {
        console.error("[getAuditLog] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener registro de auditoría",
        });
      }
    }),
});
