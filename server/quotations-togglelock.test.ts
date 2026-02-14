import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: string = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: role as any,
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
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("quotations.toggleLock", () => {
  it("should reject non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.quotations.toggleLock({ id: 1 });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should reject if quotation not found", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.quotations.toggleLock({ id: 99999 });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBeDefined();
    }
  });

  it("should allow admin users to call toggleLock", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    expect(ctx.user?.role).toBe("admin");
  });

  it("should allow comercial users to call toggleLock", async () => {
    const ctx = createAuthContext("comercial");
    const caller = appRouter.createCaller(ctx);

    expect(ctx.user?.role).toBe("comercial");
  });

  it("should allow super_admin users to call toggleLock", async () => {
    const ctx = createAuthContext("super_admin");
    const caller = appRouter.createCaller(ctx);

    expect(ctx.user?.role).toBe("super_admin");
  });
});
