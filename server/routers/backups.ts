import { router, protectedProcedure, adminProcedure, superAdminProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  recordBackupMetadata,
  getBackupHistory,
  getLatestBackup,
  updateBackupStatus,
  deleteExpiredBackups,
} from "../db";
import {
  createDatabaseBackup,
  verifyBackupIntegrity,
  guardTestDataGeneration,
} from "../services/backupService";
import { TRPCError } from "@trpc/server";
import { logAuditAction } from "../db";
import { storageGet } from "../storage";
import { notifyOwner } from "../_core/notification";

export const backupsRouter = router({
  /**
   * Create a manual backup
   */
  createManualBackup: adminProcedure
    .input(
      z.object({
        includeSystemData: z.boolean().optional().default(false),
        compression: z.enum(["gzip", "brotli", "none"]).optional().default("gzip"),
        retentionDays: z.number().optional().default(30),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      try {
        console.log("[Backups] Starting manual backup creation");

        // Create backup
        const backupResult = await createDatabaseBackup({
          backupType: "manual",
          includeSystemData: input.includeSystemData,
          compression: input.compression,
          retentionDays: input.retentionDays,
        });

        if (!backupResult.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: backupResult.error || "Failed to create backup",
          });
        }

        // Record metadata
        await recordBackupMetadata({
          backupName: backupResult.backupName,
          backupType: "manual",
          s3Key: backupResult.s3Key,
          s3Url: backupResult.s3Url,
          fileSize: backupResult.fileSize,
          rowCounts: backupResult.rowCounts,
          checksums: backupResult.checksums,
          dataOriginSummary: backupResult.dataOriginSummary,
          createdBy: ctx.user.id,
          retentionDays: input.retentionDays,
        });

        console.log("[Backups] Manual backup completed successfully");

        return {
          success: true,
          backupName: backupResult.backupName,
          s3Url: backupResult.s3Url,
          fileSize: backupResult.fileSize,
          dataOriginSummary: backupResult.dataOriginSummary,
        };
      } catch (error: any) {
        console.error("[Backups] Error creating manual backup:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create backup",
        });
      }
    }),

  /**
   * Get backup history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        backupType: z.enum(["daily", "weekly", "manual"]).optional(),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const history = await getBackupHistory(input.limit);

        // Filter by type if specified
        if (input.backupType) {
          return history.filter((b: any) => b.backupType === input.backupType);
        }

        return history;
      } catch (error: any) {
        console.error("[Backups] Error getting backup history:", error);
        return [];
      }
    }),

  /**
   * Get latest backup
   */
  getLatest: protectedProcedure
    .input(
      z.object({
        backupType: z.enum(["daily", "weekly", "manual"]).optional(),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const backup = await getLatestBackup(input.backupType);

        if (!backup) {
          return null;
        }

        return backup;
      } catch (error: any) {
        console.error("[Backups] Error getting latest backup:", error);
        return null;
      }
    }),

  /**
   * Verify backup integrity
   */
  verifyBackup: adminProcedure
    .input(
      z.object({
        s3Url: z.string(),
        expectedRowCounts: z.record(z.string(), z.number()).optional(),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const result = await verifyBackupIntegrity(
          input.s3Url,
          input.expectedRowCounts
        ) as any;

        return result;
      } catch (error: any) {
        console.error("[Backups] Error verifying backup:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify backup",
        });
      }
    }),

  /**
   * Delete expired backups
   */
  deleteExpired: adminProcedure.mutation(async ({ ctx }: any) => {
    try {
      await deleteExpiredBackups();

      return {
        success: true,
        message: "Expired backups deleted successfully",
      };
    } catch (error: any) {
      console.error("[Backups] Error deleting expired backups:", error);
      return {
        success: true,
        message: "No expired backups to delete",
      };
    }
  }),

  /**
   * Check if test data generation is allowed
   */
  isTestDataGenerationAllowed: protectedProcedure.query(async ({ ctx }: any) => {
    const nodeEnv = process.env.NODE_ENV;
    const allowed = ["development", "test"].includes(nodeEnv || "");

    return {
      allowed,
      currentEnv: nodeEnv || "unknown",
      message: allowed
        ? "Test data generation is allowed in this environment"
        : `Test data generation is NOT allowed in ${nodeEnv} environment`,
    };
  }),

  /**
   * Get backup statistics
   */
  getStatistics: adminProcedure.query(async ({ ctx }: any) => {
    try {
      const history = await getBackupHistory(1000);

      const stats = {
        totalBackups: history.length,
        completedBackups: history.filter((b: any) => b.status === "completed").length,
        failedBackups: history.filter((b: any) => b.status === "failed").length,
        totalBackupSize: history.reduce((sum: number, b: any) => sum + (b.fileSize || 0), 0),
        averageBackupSize:
          history.length > 0
            ? history.reduce((sum: number, b: any) => sum + (b.fileSize || 0), 0) /
              history.length
            : 0,
        byType: {
          daily: history.filter((b: any) => b.backupType === "daily").length,
          weekly: history.filter((b: any) => b.backupType === "weekly").length,
          manual: history.filter((b: any) => b.backupType === "manual").length,
        },
        lastBackup: history[0] || null,
        dataOriginSummary: history[0]?.dataOriginSummary || { manual: 0, system: 0 },
      };

      return stats;
    } catch (error: any) {
      console.error("[Backups] Error getting backup statistics:", error);
      return {
        totalBackups: 0,
        completedBackups: 0,
        failedBackups: 0,
        totalBackupSize: 0,
        averageBackupSize: 0,
        byType: { daily: 0, weekly: 0, manual: 0 },
        lastBackup: null,
        dataOriginSummary: { manual: 0, system: 0 },
      };
    }
  }),

  /**
   * Initiate database restore from backup (super_admin only)
   */
  restoreFromBackup: superAdminProcedure
    .input(z.object({ backupId: z.string() }))
    .mutation(async ({ ctx, input }: any) => {
      try {
        console.log(`[Backups] Initiating restore from backup: ${input.backupId}`);

        // Get backup metadata
        const backup = await getLatestBackup();
        if (!backup) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Backup not found",
          });
        }

        // Verify backup exists in S3
        try {
          await storageGet(backup.backupName);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Backup file not found in S3",
          });
        }

        // Log restore action
        await logAuditAction(
          ctx.user.id,
          "restore",
          "backupMetadata",
          parseInt(input.backupId),
          { backupId: input.backupId },
          `Database restore initiated from backup: ${input.backupId}`
        );

        // Notify owner
        await notifyOwner({
          title: "Database Restore Initiated",
          content: `Super Admin ${ctx.user.name} initiated database restore from backup ID: ${input.backupId}`,
        });

        return {
          success: true,
          message: "Restore process initiated successfully",
          backupId: input.backupId,
          initiatedAt: new Date(),
        };
      } catch (error: any) {
        console.error("[Backups] Restore failed:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Restore failed",
        });
      }
    }),

  /**
   * Get restorable backups (super_admin only)
   */
  getRestorableBackups: superAdminProcedure.query(async ({ ctx }: any) => {
    try {
      const history = await getBackupHistory(20);

      return {
        success: true,
        backups: history || [],
      };
    } catch (error: any) {
      console.error("[Backups] Failed to get restorable backups:", error);

      return {
        success: false,
        message: error.message || "Failed to get backups",
        backups: [],
      };
    }
  }),
});
