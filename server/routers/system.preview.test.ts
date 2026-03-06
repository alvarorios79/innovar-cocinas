import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb } from "../db";
import { appRouter } from "../routers";
import { clients, quotations, projects, appointments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "../_core/context";

/**
 * Test suite for Zona Crítica preview functionality
 * 
 * Tests the getSystemDataCounts procedure to ensure:
 * 1. Preview correctly counts system-generated records
 * 2. Manual records are not included in preview counts
 * 3. Different record types are counted separately
 */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "super_admin" | "admin" | "user" = "super_admin") {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Zona Crítica Preview Functionality", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeEach(async () => {
    db = await getDb();
  });

  afterEach(async () => {
    // Cleanup test data
    if (db) {
      await db.delete(appointments).where(eq(appointments.dataOrigin, "system"));
      await db.delete(quotations).where(eq(quotations.dataOrigin, "system"));
      await db.delete(projects).where(eq(projects.dataOrigin, "system"));
      await db.delete(clients).where(eq(clients.dataOrigin, "system"));
    }
  });

  it("should return zero counts when no system data exists", async () => {
    if (!db) throw new Error("Database not available");
    
    // Ensure database is clean
    await db.delete(appointments).where(eq(appointments.dataOrigin, "system"));
    await db.delete(quotations).where(eq(quotations.dataOrigin, "system"));
    await db.delete(projects).where(eq(projects.dataOrigin, "system"));
    await db.delete(clients).where(eq(clients.dataOrigin, "system"));
    
    const ctx = createContext("super_admin");
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.system.getSystemDataCounts();
    
    expect(result).toBeDefined();
    expect(result.clients).toBe(0);
    expect(result.quotations).toBe(0);
    expect(result.projects).toBe(0);
    expect(result.appointments).toBe(0);
    expect(result.tasks).toBe(0);
  });

  it("should count only system-generated clients, not manual ones", async () => {
    if (!db) throw new Error("Database not available");

    // Create manual client
    await db.insert(clients).values({
      name: "Manual Client",
      email: "manual@test.com",
      whatsappPhone: "1234567890",
      dataOrigin: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create system client
    await db.insert(clients).values({
      name: "System Client",
      email: "system@test.com",
      whatsappPhone: "0987654321",
      dataOrigin: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createContext("super_admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.system.getSystemDataCounts();
    
    expect(result.clients).toBe(1);
    expect(result.quotations).toBe(0);
  });

  it("should separate manual and system records correctly", async () => {
    if (!db) throw new Error("Database not available");

    // Create 2 manual clients
    for (let i = 0; i < 2; i++) {
      await db.insert(clients).values({
        name: `Manual Client ${i}`,
        email: `manual${i}@test.com`,
        whatsappPhone: "1234567890",
        dataOrigin: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create 3 system clients
    for (let i = 0; i < 3; i++) {
      await db.insert(clients).values({
        name: `System Client ${i}`,
        email: `system${i}@test.com`,
        whatsappPhone: "1234567890",
        dataOrigin: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const ctx = createContext("super_admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.system.getSystemDataCounts();
    
    // Should only count system records
    expect(result.clients).toBe(3);
  });

  it("should return correct counts after partial cleanup", async () => {
    if (!db) throw new Error("Database not available");

    // Create 5 system clients
    for (let i = 0; i < 5; i++) {
      await db.insert(clients).values({
        name: `System Client ${i}`,
        email: `system${i}@test.com`,
        whatsappPhone: "1234567890",
        dataOrigin: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const ctx = createContext("super_admin");
    const caller = appRouter.createCaller(ctx);

    // Verify initial count
    let result = await caller.system.getSystemDataCounts();
    expect(result.clients).toBe(5);

    // Delete 2 system clients manually
    await db.delete(clients).where(eq(clients.dataOrigin, "system")).limit(2);

    // Check updated count
    result = await caller.system.getSystemDataCounts();
    expect(result.clients).toBe(3);
  });

  it("should deny access to non-super_admin users", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.system.getSystemDataCounts();
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toContain("super administradores");
    }
  });

  it("should handle empty database gracefully", async () => {
    // Ensure database is empty
    await db?.delete(appointments).where(eq(appointments.dataOrigin, "system"));
    await db?.delete(quotations).where(eq(quotations.dataOrigin, "system"));
    await db?.delete(projects).where(eq(projects.dataOrigin, "system"));
    await db?.delete(clients).where(eq(clients.dataOrigin, "system"));

    const ctx = createContext("super_admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.system.getSystemDataCounts();
    
    expect(result).toBeDefined();
    expect(result.clients).toBe(0);
    expect(result.quotations).toBe(0);
    expect(result.projects).toBe(0);
    expect(result.appointments).toBe(0);
  });

  it("should return structure with all required fields", async () => {
    const ctx = createContext("super_admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.system.getSystemDataCounts();
    
    expect(result).toHaveProperty("clients");
    expect(result).toHaveProperty("quotations");
    expect(result).toHaveProperty("projects");
    expect(result).toHaveProperty("appointments");
    expect(result).toHaveProperty("tasks");
    
    expect(typeof result.clients).toBe("number");
    expect(typeof result.quotations).toBe("number");
    expect(typeof result.projects).toBe("number");
    expect(typeof result.appointments).toBe("number");
    expect(typeof result.tasks).toBe("number");
  });

  it("should provide accurate preview for cleanup decision", async () => {
    if (!db) throw new Error("Database not available");

    // Create test data with different origins
    for (let i = 0; i < 3; i++) {
      await db.insert(clients).values({
        name: `System Client ${i}`,
        email: `system${i}@test.com`,
        whatsappPhone: "1234567890",
        dataOrigin: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    for (let i = 0; i < 2; i++) {
      await db.insert(clients).values({
        name: `Manual Client ${i}`,
        email: `manual${i}@test.com`,
        whatsappPhone: "1234567890",
        dataOrigin: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const ctx = createContext("super_admin");
    const caller = appRouter.createCaller(ctx);
    const preview = await caller.system.getSystemDataCounts();
    
    // Preview should show only system records
    expect(preview.clients).toBe(3);
    
    // Verify manual records are not counted in preview
    const systemClients = await db.select().from(clients).where(eq(clients.dataOrigin, "system"));
    expect(systemClients.length).toBe(3);
  });
});
