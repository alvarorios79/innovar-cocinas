import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@innovar.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
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

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@innovar.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
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

describe("userManagement.create", () => {

  it("should create a new user successfully as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueEmail = `newuser-${Date.now()}@test.com`;
    const result = await caller.userManagement.create({
      name: "New User",
      email: uniqueEmail,
      role: "user",
    });

    expect(result.success).toBe(true);
  });

  it("should create a new admin successfully", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueEmail = `newadmin-${Date.now()}@test.com`;
    const result = await caller.userManagement.create({
      name: "New Admin",
      email: uniqueEmail,
      role: "admin",
    });

    expect(result.success).toBe(true);
  });

  it("should reject creation with invalid email format", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.userManagement.create({
        name: "Invalid Email User",
        email: "invalid-email",
        role: "user",
      })
    ).rejects.toThrow();
  });

  it("should reject creation with duplicate email", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueEmail = `duplicate-${Date.now()}@test.com`;
    
    // Create first user
    await caller.userManagement.create({
      name: "First User",
      email: uniqueEmail,
      role: "user",
    });

    // Try to create duplicate
    await expect(
      caller.userManagement.create({
        name: "Duplicate User",
        email: uniqueEmail,
        role: "user",
      })
    ).rejects.toThrow("Ya existe un usuario con este email");
  });

  it("should reject creation when non-admin tries to create user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.userManagement.create({
        name: "Unauthorized User",
        email: "unauthorized@test.com",
        role: "user",
      })
    ).rejects.toThrow("Solo administradores pueden crear usuarios");
  });

  it("should reject creation with empty name", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.userManagement.create({
        name: "",
        email: "emptyname@test.com",
        role: "user",
      })
    ).rejects.toThrow();
  });

  it("should reject creation with empty email", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.userManagement.create({
        name: "Empty Email User",
        email: "",
        role: "user",
      })
    ).rejects.toThrow();
  });
});
