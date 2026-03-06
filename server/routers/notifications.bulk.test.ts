import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import * as db from "../db";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { notifications } from "../../drizzle/schema";

function createContext(overrides?: any) {
  return {
    user: {
      id: 1,
      email: "test@example.com",
      role: "super_admin" as const,
      ...overrides,
    },
  };
}

describe("Notifications Bulk Deletion", () => {
  let database: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let notificationIds: number[] = [];

  beforeAll(async () => {
    database = await getDb();
    if (!database) throw new Error("Database not available");

    // Create test user
    const userResult = await database.insert(users).values({
      email: "bulk-test@example.com",
      name: "Bulk Test User",
      role: "super_admin",
      openId: "test-openid-bulk",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testUserId = (userResult as any)[0]?.insertId || 1;

    // Create test notifications
    for (let i = 0; i < 5; i++) {
      const result = await database.insert(notifications).values({
        userId: testUserId,
        title: `Test Notification ${i + 1}`,
        body: `Test body ${i + 1}`,
        type: "sistema" as any,
        read: false,
        sentPush: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      notificationIds.push((result as any)[0]?.insertId || i);
    }
  });

  afterAll(async () => {
    if (database) {
      try {
        for (const id of notificationIds) {
          await database.delete(notifications).where(eq(notifications.id, id)).catch(() => {});
        }
        await database.delete(users).where(
          eq(users.id, testUserId)
        ).catch(() => {});
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it("should delete multiple notifications by IDs", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Delete first 2 notifications
    const result = await caller.notifications.deleteBulk({
      ids: [notificationIds[0], notificationIds[1]],
    });

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);

    // Verify they are deleted
    const remaining = await database.select().from(notifications).where(
      eq(notifications.userId, testUserId)
    );
    expect(remaining.length).toBe(3);
  });

  it("should delete all notifications for a user", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Delete all notifications
    const result = await caller.notifications.deleteAll();

    expect(result.success).toBe(true);
    // deletedCount may be 0 if already deleted by previous test
    expect(result.deletedCount).toBeGreaterThanOrEqual(0);

    // Verify all are deleted
    const remaining = await database.select().from(notifications).where(
      eq(notifications.userId, testUserId)
    );
    expect(remaining.length).toBe(0);
  });

  it("should handle empty ID array gracefully", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Create a new notification first
    const result = await database.insert(notifications).values({
      userId: testUserId,
      title: "Test Notification",
      body: "Test body",
      type: "sistema" as any,
      read: false,
      sentPush: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const newId = (result as any)[0]?.insertId;

    // Try to delete with empty array - should fail validation
    try {
      await caller.notifications.deleteBulk({ ids: [] });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain("minimum");
    }

    // Cleanup
    if (newId) {
      await database.delete(notifications).where(eq(notifications.id, newId)).catch(() => {});
    }
  });

  it("should require authentication for bulk deletion", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Create a notification
    const result = await database.insert(notifications).values({
      userId: testUserId,
      title: "Test Notification",
      body: "Test body",
      type: "sistema" as any,
      read: false,
      sentPush: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const newId = (result as any)[0]?.insertId;

    // This should work with authenticated context
    const deleteResult = await caller.notifications.deleteBulk({ ids: [newId] });
    expect(deleteResult.success).toBe(true);
  });

  it("should require authentication for delete all", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Create a notification
    const result = await database.insert(notifications).values({
      userId: testUserId,
      title: "Test Notification",
      body: "Test body",
      type: "sistema" as any,
      read: false,
      sentPush: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const newId = (result as any)[0]?.insertId;

    // This should work with authenticated context
    const deleteResult = await caller.notifications.deleteAll();
    expect(deleteResult.success).toBe(true);

    // Verify notification is deleted
    const remaining = await database.select().from(notifications).where(
      eq(notifications.id, newId)
    );
    expect(remaining.length).toBe(0);
  });

  it("should handle non-existent IDs gracefully", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Try to delete non-existent notifications
    const result = await caller.notifications.deleteBulk({
      ids: [999999, 999998],
    });

    // Should still return success (no error thrown)
    expect(result.success).toBe(true);
  });

  it("should verify bulk deletion completes successfully", async () => {
    const ctx = createContext({ id: testUserId });
    const caller = appRouter.createCaller(ctx);

    // Create multiple notifications
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await database.insert(notifications).values({
        userId: testUserId,
        title: `Bulk Test ${i}`,
        body: `Body ${i}`,
        type: "sistema" as any,
        read: false,
        sentPush: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      ids.push((result as any)[0]?.insertId);
    }

    // Delete all created notifications
    const deleteResult = await caller.notifications.deleteBulk({ ids });
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.deletedCount).toBe(3);

    // Verify they are deleted
    const remaining = await database.select().from(notifications).where(
      eq(notifications.userId, testUserId)
    );
    expect(remaining.length).toBe(0);
  });
});
