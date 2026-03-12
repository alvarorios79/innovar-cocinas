import cron from "node-cron";
import { createDatabaseBackup } from "./backupService";
import { recordBackupMetadata, deleteExpiredBackups } from "../db";
import { notifyOwner } from "../_core/notification";

interface BackupJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
}

type ScheduledTask = ReturnType<typeof cron.schedule>;

class BackupScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  /**
   * Initialize backup scheduler
   */
  async initialize() {
    if (this.isRunning) {
      console.log("[BackupScheduler] Already initialized");
      return;
    }

    // Only run in production or if explicitly enabled
    const shouldRun =
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_BACKUP_SCHEDULER === "true";

    if (!shouldRun) {
      console.log(
        "[BackupScheduler] Backup scheduler disabled (NODE_ENV != production)"
      );
      return;
    }

    console.log("[BackupScheduler] Initializing backup scheduler...");

    try {
      // Schedule daily backup at 02:00 AM
      this.scheduleJob("daily-backup", "0 2 * * *", async () => {
        await this.runDailyBackup();
      });

      // Schedule weekly backup on Sunday at 03:00 AM
      this.scheduleJob("weekly-backup", "0 3 * * 0", async () => {
        await this.runWeeklyBackup();
      });

      // Schedule cleanup of expired backups daily at 04:00 AM
      this.scheduleJob("cleanup-expired", "0 4 * * *", async () => {
        await this.cleanupExpiredBackups();
      });

      this.isRunning = true;
      console.log("[BackupScheduler] Backup scheduler initialized successfully");

      // Notify owner that scheduler is running
      await notifyOwner({
        title: "Backup Scheduler Started",
        content:
          "Automated backup scheduler is now running. Daily backups at 02:00 AM, weekly backups on Sunday at 03:00 AM.",
      });
    } catch (error) {
      console.error("[BackupScheduler] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Schedule a backup job
   */
  private scheduleJob(
    name: string,
    schedule: string,
    task: () => Promise<void>
  ) {
    try {
      const job = cron.schedule(schedule, async () => {
        console.log(`[BackupScheduler] Running job: ${name}`);
        try {
          await task();
          console.log(`[BackupScheduler] Job completed: ${name}`);
        } catch (error) {
          console.error(`[BackupScheduler] Job failed: ${name}`, error);
          await notifyOwner({
            title: `Backup Job Failed: ${name}`,
            content: `Automated backup job "${name}" failed. Error: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      });

      this.jobs.set(name, job);
      console.log(`[BackupScheduler] Scheduled job: ${name} (${schedule})`);
    } catch (error) {
      console.error(`[BackupScheduler] Failed to schedule job ${name}:`, error);
      throw error;
    }
  }

  /**
   * Run daily backup
   */
  private async runDailyBackup() {
    try {
      console.log("[BackupScheduler] Starting daily backup...");

      const result = await createDatabaseBackup({
        backupType: "daily",
        includeSystemData: false,
        compression: "gzip",
        retentionDays: 7, // Keep 7 daily backups
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create daily backup");
      }

      // Record metadata
      await recordBackupMetadata({
        backupName: result.backupName,
        backupType: "daily",
        s3Key: result.s3Key,
        status: "completed",
        size: result.fileSize ?? 0,
      });

      console.log(
        `[BackupScheduler] Daily backup completed: ${result.backupName}`
      );

      // Notify owner of successful backup
      await notifyOwner({
        title: "Daily Backup Completed",
        content: `Daily backup completed successfully. File size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB. Backup: ${result.backupName}`,
      });
    } catch (error) {
      console.error("[BackupScheduler] Daily backup failed:", error);
      throw error;
    }
  }

  /**
   * Run weekly backup
   */
  private async runWeeklyBackup() {
    try {
      console.log("[BackupScheduler] Starting weekly backup...");

      const result = await createDatabaseBackup({
        backupType: "weekly",
        includeSystemData: false,
        compression: "brotli", // Use better compression for weekly backups
        retentionDays: 28, // Keep 4 weekly backups (4 weeks)
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create weekly backup");
      }

      // Record metadata
      await recordBackupMetadata({
        backupName: result.backupName,
        backupType: "weekly",
        s3Key: result.s3Key,
        status: "completed",
        size: result.fileSize ?? 0,
      });

      console.log(
        `[BackupScheduler] Weekly backup completed: ${result.backupName}`
      );

      // Notify owner of successful backup
      await notifyOwner({
        title: "Weekly Backup Completed",
        content: `Weekly backup completed successfully. File size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB. Backup: ${result.backupName}`,
      });
    } catch (error) {
      console.error("[BackupScheduler] Weekly backup failed:", error);
      throw error;
    }
  }

  /**
   * Cleanup expired backups
   */
  private async cleanupExpiredBackups() {
    try {
      console.log("[BackupScheduler] Starting cleanup of expired backups...");

      const result = await deleteExpiredBackups();

      console.log("[BackupScheduler] Cleanup completed successfully");

      // Notify owner of cleanup
      await notifyOwner({
        title: "Backup Cleanup Completed",
        content: `Expired backups have been cleaned up according to retention policy.`,
      });
    } catch (error) {
      console.error("[BackupScheduler] Cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log("[BackupScheduler] Stopping backup scheduler...");
    this.jobs.forEach((job) => {
      job.stop();
    });
    this.jobs.clear();
    this.isRunning = false;
    console.log("[BackupScheduler] Backup scheduler stopped");
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size,
    };
  }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();
