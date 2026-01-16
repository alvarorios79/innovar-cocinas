import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

describe("userManagement.resetPassword", () => {
  let superAdminId: number;
  let targetUserId: number;
  const superAdminEmail = `superadmin-reset-${Date.now()}@test.com`;
  const targetEmail = `target-reset-${Date.now()}@test.com`;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create super_admin user
    const [superAdmin] = await db.insert(users).values({
      openId: `superadmin-${Date.now()}`,
      name: "Super Admin Test",
      email: superAdminEmail,
      role: "super_admin",
    }).$returningId();
    superAdminId = superAdmin.id;

    // Create target user
    const [targetUser] = await db.insert(users).values({
      openId: `target-${Date.now()}`,
      name: "Target User",
      email: targetEmail,
      role: "user",
    }).$returningId();
    targetUserId = targetUser.id;
  });

  function createSuperAdminContext(): { ctx: TrpcContext } {
    const superAdminUser: AuthenticatedUser = {
      id: superAdminId,
      openId: `superadmin-${Date.now()}`,
      name: "Super Admin Test",
      email: superAdminEmail,
      role: "super_admin",
      createdAt: new Date(),
    };
    return { ctx: { user: superAdminUser } };
  }

  function createAdminContext(): { ctx: TrpcContext } {
    const adminUser: AuthenticatedUser = {
      id: 999,
      openId: "admin-test",
      name: "Admin Test",
      email: "admin@test.com",
      role: "admin",
      createdAt: new Date(),
    };
    return { ctx: { user: adminUser } };
  }

  it("should allow super_admin to reset password", async () => {
    const caller = appRouter.createCaller(createSuperAdminContext().ctx);
    
    const result = await caller.userManagement.resetPassword({
      userId: targetUserId,
    });

    expect(result.success).toBe(true);
    expect(result.tempPassword).toBeDefined();
    expect(result.tempPassword).toMatch(/^Innovar\d{4}\*$/);
    expect(result.userName).toBe("Target User");
  });

  it("should not allow admin to reset password", async () => {
    const caller = appRouter.createCaller(createAdminContext().ctx);
    
    await expect(
      caller.userManagement.resetPassword({
        userId: targetUserId,
      })
    ).rejects.toThrow("Solo super administradores pueden resetear contraseñas");
  });

  it("should not allow super_admin to reset their own password", async () => {
    const caller = appRouter.createCaller(createSuperAdminContext().ctx);
    
    await expect(
      caller.userManagement.resetPassword({
        userId: superAdminId,
      })
    ).rejects.toThrow("No puedes resetear tu propia contraseña por este método");
  });

  it("should return error for non-existent user", async () => {
    const caller = appRouter.createCaller(createSuperAdminContext().ctx);
    
    await expect(
      caller.userManagement.resetPassword({
        userId: 999999,
      })
    ).rejects.toThrow("Usuario no encontrado");
  });
});
