import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb } from "../db";
import { appRouter } from "../routers";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "../_core/context";
import { hashPassword } from "../password-auth";

/**
 * Test suite for userManagement.delete endpoint
 * 
 * Ensures:
 * 1. JSON responses are always returned (never HTML)
 * 2. Proper permission handling (admin/super_admin/comercial)
 * 3. Error responses are structured JSON
 * 4. Success responses are JSON
 */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: Partial<AuthenticatedUser> = {}) {
  const defaultUser: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: { ...defaultUser, ...user },
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

describe("userManagement.delete - JSON Response Validation", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let adminUserId: number;
  let superAdminUserId: number;

  beforeEach(async () => {
    db = await getDb();

    // Create test users
    const testUser = await db.insert(users).values({
      openId: `openid-${Date.now()}-1`,
      name: "Test User to Delete",
      email: `delete-test-${Date.now()}@example.com`,
      role: "user",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testUserId = testUser[0]?.insertId as number;

    const adminUser = await db.insert(users).values({
      openId: `openid-${Date.now()}-2`,
      name: "Admin User",
      email: `admin-test-${Date.now()}@example.com`,
      role: "admin",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    adminUserId = adminUser[0]?.insertId as number;

    const superAdminUser = await db.insert(users).values({
      openId: `openid-${Date.now()}-3`,
      name: "Super Admin User",
      email: `super-admin-test-${Date.now()}@example.com`,
      role: "super_admin",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    superAdminUserId = superAdminUser[0]?.insertId as number;
  });

  afterEach(async () => {
    // Cleanup test users
    if (db && testUserId) {
      await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
    }
    if (db && adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId)).catch(() => {});
    }
    if (db && superAdminUserId) {
      await db.delete(users).where(eq(users.id, superAdminUserId)).catch(() => {});
    }
  });

  it("should return JSON success response when deleting a user as super_admin", async () => {
    const ctx = createContext({ id: superAdminUserId, role: "super_admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.delete({ userId: testUserId });

    // Verify response is JSON object with success field
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(typeof result.success).toBe("boolean");

    // Verify user was soft deleted (deletedAt set)
    const deletedUser = await db?.select().from(users).where(eq(users.id, testUserId));
    expect(deletedUser).toHaveLength(1);
    expect(deletedUser?.[0]?.deletedAt).not.toBeNull();
  });

  it("should return JSON success response when deleting a user as admin", async () => {
    const ctx = createContext({ id: adminUserId, role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.delete({ userId: testUserId });

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  it("should return JSON success response when deleting a user as comercial", async () => {
    const comercialUser = await db?.insert(users).values({
      openId: `openid-${Date.now()}-comercial`,
      name: "Comercial User",
      email: `comercial-test-${Date.now()}@example.com`,
      role: "comercial",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const comercialUserId = comercialUser?.[0]?.insertId as number;

    try {
      const ctx = createContext({ id: comercialUserId, role: "comercial" });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userManagement.delete({ userId: testUserId });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    } finally {
      if (comercialUserId) {
        await db?.delete(users).where(eq(users.id, comercialUserId)).catch(() => {});
      }
    }
  });

  it("should return JSON error when user lacks permission (FORBIDDEN)", async () => {
    const ctx = createContext({ id: 999, role: "user" });
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.userManagement.delete({ userId: testUserId });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      // Verify error is JSON-serializable and has proper structure
      expect(error).toBeDefined();
      expect(error.code).toBe("FORBIDDEN");
      expect(typeof error.message).toBe("string");
      expect(error.message).toContain("administradores");
      
      // Verify error can be JSON.stringify'd (not HTML)
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain("<!DOCTYPE");
      expect(errorJson).not.toContain("<html");
    }
  });

  it("should return JSON error when trying to delete self", async () => {
    const ctx = createContext({ id: adminUserId, role: "admin" });
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.userManagement.delete({ userId: adminUserId });
      expect.fail("Should have thrown BAD_REQUEST error");
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toContain("eliminarte a ti mismo");
      
      // Verify error is JSON-serializable
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain("<!DOCTYPE");
    }
  });

  it("should return JSON error when user not found (NOT_FOUND)", async () => {
    const ctx = createContext({ id: superAdminUserId, role: "super_admin" });
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.userManagement.delete({ userId: 99999 });
      expect.fail("Should have thrown NOT_FOUND error");
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toContain("Usuario no encontrado");
      
      // Verify error is JSON-serializable
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain("<!DOCTYPE");
    }
  });

  it("should return JSON error when non-super_admin tries to delete admin", async () => {
    const ctx = createContext({ id: adminUserId, role: "admin" });
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.userManagement.delete({ userId: superAdminUserId });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toContain("super administradores");
      
      // Verify error is JSON-serializable
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain("<!DOCTYPE");
    }
  });

  it("should allow super_admin to delete another admin", async () => {
    const ctx = createContext({ id: superAdminUserId, role: "super_admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.delete({ userId: adminUserId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result).toBe("object");

    // Verify user was soft deleted (deletedAt set)
    const deletedUser = await db?.select().from(users).where(eq(users.id, adminUserId));
    expect(deletedUser).toHaveLength(1);
    expect(deletedUser?.[0]?.deletedAt).not.toBeNull();
  });

  it("should return JSON error with proper structure for invalid input", async () => {
    const ctx = createContext({ id: superAdminUserId, role: "super_admin" });
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-ignore - intentionally passing invalid input
      await caller.userManagement.delete({ userId: "not-a-number" });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.code).toBe("BAD_REQUEST");
      
      // Verify error is JSON-serializable
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain("<!DOCTYPE");
    }
  });

  it("should not return HTML in any error response", async () => {
    const ctx = createContext({ id: 999, role: "user" });
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.userManagement.delete({ userId: testUserId });
    } catch (error: any) {
      // Verify no HTML in error
      const errorString = JSON.stringify(error);
      expect(errorString).not.toMatch(/<!DOCTYPE/i);
      expect(errorString).not.toMatch(/<html/i);
      expect(errorString).not.toMatch(/<body/i);
      expect(errorString).not.toMatch(/<head/i);
    }
  });

  it("should not return HTML in success response", async () => {
    const ctx = createContext({ id: superAdminUserId, role: "super_admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.userManagement.delete({ userId: testUserId });

    // Verify response is pure JSON, not HTML
    const responseString = JSON.stringify(result);
    expect(responseString).not.toMatch(/<!DOCTYPE/i);
    expect(responseString).not.toMatch(/<html/i);
    expect(responseString).not.toMatch(/<body/i);
  });

  it("should return JSON error when database error occurs", async () => {
    const ctx = createContext({ id: superAdminUserId, role: "super_admin" });
    const caller = appRouter.createCaller(ctx);

    // Try to delete a user that doesn't exist (should return NOT_FOUND, not HTML)
    try {
      await caller.userManagement.delete({ userId: 999999 });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      // Should be a proper error, not HTML
      expect(error).toBeDefined();
      expect(error.code).toBeDefined();
      
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain("<!DOCTYPE");
    }
  });
});
