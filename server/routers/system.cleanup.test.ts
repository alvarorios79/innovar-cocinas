import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createCallerFactory } from "../_core/trpc";
import { getDb } from "../db";
import { clients, quotations, projects, appointments, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const createCaller = createCallerFactory();

describe("System Router - cleanupData", () => {
  let db: any;
  let superAdminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test users
    const userResult = await db
      .insert(users)
      .values([
        {
          email: "admin@test.com",
          password: "hashed_password",
          role: "super_admin",
          dataOrigin: "manual",
        },
        {
          email: "user@test.com",
          password: "hashed_password",
          role: "user",
          dataOrigin: "manual",
        },
      ]);

    // Get the inserted users
    const insertedUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@test.com"));
    superAdminUser = insertedUsers[0];

    const regularUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, "user@test.com"));
    regularUser = regularUsers[0];
  });

  afterAll(async () => {
    if (!db) return;

    // Clean up test data
    await db.delete(appointments).where(eq(appointments.dataOrigin, "system"));
    await db.delete(quotations).where(eq(quotations.dataOrigin, "system"));
    await db.delete(projects).where(eq(projects.dataOrigin, "system"));
    await db.delete(clients).where(eq(clients.dataOrigin, "system"));
    await db
      .delete(users)
      .where(eq(users.email, "admin@test.com"));
    await db
      .delete(users)
      .where(eq(users.email, "user@test.com"));
  });

  it("should cleanup system data when called by super_admin", async () => {
    // Create test system data
    const testClient = await db
      .insert(clients)
      .values({
        name: "Test Client System",
        email: "test@system.com",
        dataOrigin: "system",
        createdBy: superAdminUser.id,
      });

    // Call cleanup with super_admin context
    const caller = createCaller({
      user: superAdminUser,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.system.cleanupData();

    expect(result.success).toBe(true);
    expect(result.message).toBe("Limpieza del sistema completada correctamente");
    expect(result.totalDeleted).toBeGreaterThanOrEqual(0);
  });

  it("should reject cleanup when called by regular user", async () => {
    const caller = createCaller({
      user: regularUser,
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.system.cleanupData();
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toContain("super_admin");
    }
  });

  it("should only delete system data, not manual data", async () => {
    // Create system and manual data
    const systemClient = await db
      .insert(clients)
      .values({
        name: "System Client",
        email: "system@test.com",
        dataOrigin: "system",
        createdBy: superAdminUser.id,
      });

    const manualClient = await db
      .insert(clients)
      .values({
        name: "Manual Client",
        email: "manual@test.com",
        dataOrigin: "manual",
        createdBy: superAdminUser.id,
      });

    // Call cleanup
    const caller = createCaller({
      user: superAdminUser,
      req: {} as any,
      res: {} as any,
    });

    await caller.system.cleanupData();

    // Verify manual data still exists
    const remainingClients = await db
      .select()
      .from(clients)
      .where(eq(clients.email, "manual@test.com"));

    expect(remainingClients.length).toBe(1);
    expect(remainingClients[0].dataOrigin).toBe("manual");

    // Verify system data was deleted
    const deletedClients = await db
      .select()
      .from(clients)
      .where(eq(clients.email, "system@test.com"));

    expect(deletedClients.length).toBe(0);
  });
});
