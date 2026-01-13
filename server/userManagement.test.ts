import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const adminUser: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

function createUserContext(): { ctx: TrpcContext } {
  const regularUser: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: regularUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("userManagement.listAll", () => {
  it("allows admin to list all users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw error
    const users = await caller.userManagement.listAll();
    expect(Array.isArray(users)).toBe(true);
  });

  it("prevents non-admin from listing users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.userManagement.listAll()).rejects.toThrow("Solo administradores pueden ver usuarios");
  });
});

describe("userManagement.updateRole", () => {
  it("prevents non-admin from updating roles", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.userManagement.updateRole({
        userId: 3,
        newRole: "admin",
      })
    ).rejects.toThrow("Solo administradores pueden cambiar roles");
  });

  it("prevents admin from removing their own admin role", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.userManagement.updateRole({
        userId: 1, // Same as admin's ID
        newRole: "user",
      })
    ).rejects.toThrow("No puedes quitarte tus propios permisos de administrador");
  });
});
