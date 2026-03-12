import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as dbModule from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

describe("userManagement.resetPassword", () => {
  let superAdminId: number;
  let targetUserId: number;
  const superAdminEmail = `superadmin-reset-${Date.now()}@test.com`;
  const targetEmail = `target-reset-${Date.now()}@test.com`;

  beforeAll(async () => {
    // Create super_admin user using createUserExtended (handles insertId correctly)
    superAdminId = await dbModule.createUserExtended({
      dataOrigin: 'system',
      name: "Super Admin Test",
      email: superAdminEmail,
      role: "super_admin",
    });

    // Create target user
    targetUserId = await dbModule.createUserExtended({
      dataOrigin: 'system',
      name: "Target User",
      email: targetEmail,
      role: "user",
    });
  });

  afterAll(async () => {
    await dbModule.deleteUser(superAdminId).catch(() => {});
    await dbModule.deleteUser(targetUserId).catch(() => {});
  });

  function createSuperAdminContext(): TrpcContext {
    const superAdminUser: AuthenticatedUser = {
      id: superAdminId,
      openId: `superadmin-${Date.now()}`,
      name: "Super Admin Test",
      email: superAdminEmail,
      role: "super_admin",
      createdAt: new Date(),
    };
    return { user: superAdminUser };
  }

  function createAdminContext(): TrpcContext {
    const adminUser: AuthenticatedUser = {
      id: 999,
      openId: "admin-test",
      name: "Admin Test",
      email: "admin@test.com",
      role: "admin",
      createdAt: new Date(),
    };
    return { user: adminUser };
  }

  it("should allow super_admin to reset password", async () => {
    const caller = appRouter.createCaller(createSuperAdminContext());
    
    const result = await caller.userManagement.resetPassword({
      userId: targetUserId,
    });

    expect(result.success).toBe(true);
    expect(result.tempPassword).toBeDefined();
    expect(result.tempPassword).toMatch(/^Innovar\d{4}\*$/);
    expect(result.userName).toBe("Target User");
  });

  it("should not allow admin to reset password", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    
    await expect(
      caller.userManagement.resetPassword({
        userId: targetUserId,
      })
    ).rejects.toThrow("Solo super administradores pueden resetear contraseñas");
  });

  it("should not allow super_admin to reset their own password", async () => {
    const caller = appRouter.createCaller(createSuperAdminContext());
    
    await expect(
      caller.userManagement.resetPassword({
        userId: superAdminId,
      })
    ).rejects.toThrow("No puedes resetear tu propia contraseña por este método");
  });

  it("should return error for non-existent user", async () => {
    const caller = appRouter.createCaller(createSuperAdminContext());
    
    await expect(
      caller.userManagement.resetPassword({
        userId: 999999,
      })
    ).rejects.toThrow("Usuario no encontrado");
  });
});
