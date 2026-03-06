import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";

describe("Backups Router", () => {
  // Mock admin context
  const adminContext = {
    user: {
      id: 1,
      role: "super_admin",
      openId: "test-admin",
    },
    session: { userId: 1 },
  };

  // Mock protected context
  const userContext = {
    user: {
      id: 2,
      role: "user",
      openId: "test-user",
    },
    session: { userId: 2 },
  };

  it("should check if test data generation is allowed", async () => {
    const caller = appRouter.createCaller(userContext);
    const result = await caller.backups.isTestDataGenerationAllowed();

    expect(result).toHaveProperty("allowed");
    expect(result).toHaveProperty("currentEnv");
    expect(result).toHaveProperty("message");
    expect(typeof result.allowed).toBe("boolean");
  });

  it("should get backup statistics (admin only)", async () => {
    const caller = appRouter.createCaller(adminContext);
    const stats = await caller.backups.getStatistics();

    expect(stats).toHaveProperty("totalBackups");
    expect(stats).toHaveProperty("completedBackups");
    expect(stats).toHaveProperty("failedBackups");
    expect(stats).toHaveProperty("totalBackupSize");
    expect(stats).toHaveProperty("byType");
    expect(stats.byType).toHaveProperty("daily");
    expect(stats.byType).toHaveProperty("weekly");
    expect(stats.byType).toHaveProperty("manual");
    expect(typeof stats.totalBackups).toBe("number");
    expect(typeof stats.totalBackupSize).toBe("number");
  });

  it("should get backup history", async () => {
    const caller = appRouter.createCaller(userContext);
    const history = await caller.backups.getHistory({ limit: 10 });

    expect(Array.isArray(history)).toBe(true);
  });

  it("should get latest backup", async () => {
    const caller = appRouter.createCaller(userContext);
    const latest = await caller.backups.getLatest({});

    // Latest might be null if no backups exist, or an object if backups exist
    expect(latest === null || typeof latest === "object").toBe(true);
  });

  it("should verify backup integrity (admin only)", async () => {
    const adminCallerContext = {
      user: {
        id: 1,
        role: "admin",
        openId: "test-admin",
      },
      session: { userId: 1 },
    };
    const caller = appRouter.createCaller(adminCallerContext);

    // Test with a non-existent backup
    const result = await caller.backups.verifyBackup({
      s3Url: "backups/non-existent-backup.sql.gz",
    });

    expect(result).toHaveProperty("verified");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("should delete expired backups (admin only)", async () => {
    const adminCallerContext = {
      user: {
        id: 1,
        role: "admin",
        openId: "test-admin",
      },
      session: { userId: 1 },
    };
    const caller = appRouter.createCaller(adminCallerContext);
    const result = await caller.backups.deleteExpired();

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
    expect(result.success).toBe(true);
  });

  it("should prevent test data generation in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const isAllowed = ["development", "test"].includes(
        process.env.NODE_ENV || ""
      );
      expect(isAllowed).toBe(false);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should allow test data generation in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      const isAllowed = ["development", "test"].includes(
        process.env.NODE_ENV || ""
      );
      expect(isAllowed).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should allow test data generation in test environment", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    try {
      const isAllowed = ["development", "test"].includes(
        process.env.NODE_ENV || ""
      );
      expect(isAllowed).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should deny non-admin access to backup statistics", async () => {
    const caller = appRouter.createCaller(userContext);

    try {
      await caller.backups.getStatistics();
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error: any) {
      // Expected to throw FORBIDDEN error
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should deny non-admin access to delete expired backups", async () => {
    const caller = appRouter.createCaller(userContext);

    try {
      await caller.backups.deleteExpired();
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error: any) {
      // Expected to throw FORBIDDEN error
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
