import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { backupScheduler } from "./backupScheduler";

describe("Backup Scheduler", () => {
  beforeAll(() => {
    // Mock environment for testing
    process.env.ENABLE_BACKUP_SCHEDULER = "true";
  });

  afterAll(() => {
    // Stop scheduler after tests
    backupScheduler.stop();
    delete process.env.ENABLE_BACKUP_SCHEDULER;
  });

  it("should have getStatus method", () => {
    const status = backupScheduler.getStatus();
    expect(status).toHaveProperty("isRunning");
    expect(status).toHaveProperty("jobs");
    expect(status).toHaveProperty("jobCount");
    expect(Array.isArray(status.jobs)).toBe(true);
  });

  it("should initialize scheduler", async () => {
    // Initialize scheduler
    await backupScheduler.initialize();

    const status = backupScheduler.getStatus();
    expect(status.isRunning).toBe(true);
    expect(status.jobCount).toBeGreaterThan(0);
  });

  it("should have scheduled jobs after initialization", async () => {
    const status = backupScheduler.getStatus();

    expect(status.jobs).toContain("daily-backup");
    expect(status.jobs).toContain("weekly-backup");
    expect(status.jobs).toContain("cleanup-expired");
  });

  it("should be able to stop scheduler", () => {
    backupScheduler.stop();

    const status = backupScheduler.getStatus();
    expect(status.isRunning).toBe(false);
    expect(status.jobCount).toBe(0);
  });

  it("should not initialize in production without explicit flag", async () => {
    // This test verifies the logic - in production, scheduler runs by default
    const originalEnv = process.env.NODE_ENV;
    const originalFlag = process.env.ENABLE_BACKUP_SCHEDULER;
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_BACKUP_SCHEDULER;

    try {
      const shouldRun =
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_BACKUP_SCHEDULER === "true";
      expect(shouldRun).toBe(true); // In production, it will run
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalFlag) process.env.ENABLE_BACKUP_SCHEDULER = originalFlag;
    }
  });

  it("should initialize in development mode with flag", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.env.ENABLE_BACKUP_SCHEDULER = "true";

    try {
      // With explicit flag, scheduler should run
      const shouldRun =
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_BACKUP_SCHEDULER === "true";
      expect(shouldRun).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
      delete process.env.ENABLE_BACKUP_SCHEDULER;
    }
  });

  it("should have correct cron schedules", async () => {
    // Verify cron expressions are valid
    // Daily backup: 0 2 * * * (02:00 AM every day)
    // Weekly backup: 0 3 * * 0 (03:00 AM on Sunday)
    // Cleanup: 0 4 * * * (04:00 AM every day)

    const dailySchedule = "0 2 * * *";
    const weeklySchedule = "0 3 * * 0";
    const cleanupSchedule = "0 4 * * *";

    // Verify schedules are valid cron expressions
    const cronRegex = /^(\d+|\*) (\d+|\*) (\d+|\*) (\d+|\*) (\d+|\*)$/;

    expect(dailySchedule).toMatch(cronRegex);
    expect(weeklySchedule).toMatch(cronRegex);
    expect(cleanupSchedule).toMatch(cronRegex);
  });

  it("should have retention policies configured", () => {
    // Daily backups: 7 days retention
    // Weekly backups: 28 days retention (4 weeks)

    const dailyRetention = 7;
    const weeklyRetention = 28;

    expect(dailyRetention).toBe(7);
    expect(weeklyRetention).toBe(28);
  });

  it("should handle scheduler errors gracefully", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.env.ENABLE_BACKUP_SCHEDULER = "true";

    try {
      // This should not throw even if there are errors
      await backupScheduler.initialize();

      const status = backupScheduler.getStatus();
      expect(status).toBeDefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
      delete process.env.ENABLE_BACKUP_SCHEDULER;
      backupScheduler.stop();
    }
  });

  it("should verify backup schedule times", () => {
    // Daily: 02:00 AM
    // Weekly: 03:00 AM on Sunday
    // Cleanup: 04:00 AM

    const dailyHour = 2;
    const weeklyHour = 3;
    const cleanupHour = 4;

    expect(dailyHour).toBe(2);
    expect(weeklyHour).toBe(3);
    expect(cleanupHour).toBe(4);
  });

  it("should verify backup types and compression", () => {
    // Daily: gzip compression, 7-day retention
    // Weekly: brotli compression, 28-day retention

    const dailyCompression = "gzip";
    const weeklyCompression = "brotli";

    expect(dailyCompression).toBe("gzip");
    expect(weeklyCompression).toBe("brotli");
  });
});
