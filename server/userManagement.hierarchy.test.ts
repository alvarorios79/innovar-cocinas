import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createSuperAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "super-admin-user",
    email: "superadmin@innovar.com",
    name: "Super Admin User",
    loginMethod: "manus",
    role: "super_admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "admin-user",
    email: "admin@innovar.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "regular-user",
    email: "user@innovar.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("User Management - Role Hierarchy", () => {
  describe("Creating users with roles", () => {
    it("super_admin can create admin users", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueEmail = `newadmin-${Date.now()}@test.com`;
      const result = await caller.userManagement.create({
        name: "New Admin",
        email: uniqueEmail,
        role: "admin",
      });

      expect(result.success).toBe(true);
    });

    it("super_admin can create super_admin users", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueEmail = `newsuperadmin-${Date.now()}@test.com`;
      const result = await caller.userManagement.create({
        name: "New Super Admin",
        email: uniqueEmail,
        role: "super_admin",
      });

      expect(result.success).toBe(true);
    });

    it("admin cannot create admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueEmail = `unauthorized-admin-${Date.now()}@test.com`;
      
      await expect(
        caller.userManagement.create({
          name: "Unauthorized Admin",
          email: uniqueEmail,
          role: "admin",
        })
      ).rejects.toThrow("Solo super administradores pueden crear administradores");
    });

    it("admin can create regular users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueEmail = `regularuser-${Date.now()}@test.com`;
      const result = await caller.userManagement.create({
        name: "Regular User",
        email: uniqueEmail,
        role: "user",
      });

      expect(result.success).toBe(true);
    });

    it("regular user cannot create any users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueEmail = `unauthorized-${Date.now()}@test.com`;
      
      await expect(
        caller.userManagement.create({
          name: "Unauthorized",
          email: uniqueEmail,
          role: "user",
        })
      ).rejects.toThrow("Solo administradores pueden crear usuarios");
    });
  });

  describe("Deleting users", () => {
    it("super_admin can delete admin users", async () => {
      const superAdminCtx = createSuperAdminContext();
      const superAdminCaller = appRouter.createCaller(superAdminCtx);

      // Create an admin user first
      const uniqueEmail = `admin-to-delete-${Date.now()}@test.com`;
      await superAdminCaller.userManagement.create({
        name: "Admin To Delete",
        email: uniqueEmail,
        role: "admin",
      });

      // Get the user ID
      const users = await superAdminCaller.userManagement.listAll();
      const targetUser = users.find(u => u.email === uniqueEmail);
      expect(targetUser).toBeDefined();

      // Delete the user
      const result = await superAdminCaller.userManagement.delete({
        userId: targetUser!.id,
      });

      expect(result.success).toBe(true);
    });

    it("admin cannot delete admin users", async () => {
      const superAdminCtx = createSuperAdminContext();
      const superAdminCaller = appRouter.createCaller(superAdminCtx);

      // Create an admin user
      const uniqueEmail = `admin-protected-${Date.now()}@test.com`;
      await superAdminCaller.userManagement.create({
        name: "Protected Admin",
        email: uniqueEmail,
        role: "admin",
      });

      // Get the user ID
      const users = await superAdminCaller.userManagement.listAll();
      const targetUser = users.find(u => u.email === uniqueEmail);
      expect(targetUser).toBeDefined();

      // Try to delete as regular admin
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      await expect(
        adminCaller.userManagement.delete({
          userId: targetUser!.id,
        })
      ).rejects.toThrow("Solo super administradores pueden eliminar administradores");
    });

    it("admin can delete regular users", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      // Create a regular user
      const uniqueEmail = `user-to-delete-${Date.now()}@test.com`;
      await adminCaller.userManagement.create({
        name: "User To Delete",
        email: uniqueEmail,
        role: "user",
      });

      // Get the user ID
      const users = await adminCaller.userManagement.listAll();
      const targetUser = users.find(u => u.email === uniqueEmail);
      expect(targetUser).toBeDefined();

      // Delete the user
      const result = await adminCaller.userManagement.delete({
        userId: targetUser!.id,
      });

      expect(result.success).toBe(true);
    });

    it("user cannot delete themselves", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      // Regular users get FORBIDDEN error first before self-delete check
      await expect(
        caller.userManagement.delete({
          userId: ctx.user.id,
        })
      ).rejects.toThrow("Solo administradores pueden eliminar usuarios");
    });

    it("regular user cannot delete anyone", async () => {
      const userCtx = createUserContext();
      const userCaller = appRouter.createCaller(userCtx);

      // Create a user to try to delete
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);
      
      const uniqueEmail = `target-${Date.now()}@test.com`;
      await adminCaller.userManagement.create({
        name: "Target User",
        email: uniqueEmail,
        role: "user",
      });

      const users = await adminCaller.userManagement.listAll();
      const targetUser = users.find(u => u.email === uniqueEmail);
      expect(targetUser).toBeDefined();

      // Try to delete as regular user
      await expect(
        userCaller.userManagement.delete({
          userId: targetUser!.id,
        })
      ).rejects.toThrow("Solo administradores pueden eliminar usuarios");
    });
  });

  describe("Updating roles", () => {
    it("admin cannot modify admin roles", async () => {
      const superAdminCtx = createSuperAdminContext();
      const superAdminCaller = appRouter.createCaller(superAdminCtx);

      // Create an admin user
      const uniqueEmail = `admin-role-protected-${Date.now()}@test.com`;
      await superAdminCaller.userManagement.create({
        name: "Admin Role Protected",
        email: uniqueEmail,
        role: "admin",
      });

      const users = await superAdminCaller.userManagement.listAll();
      const targetUser = users.find(u => u.email === uniqueEmail);
      expect(targetUser).toBeDefined();

      // Try to modify as regular admin
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      await expect(
        adminCaller.userManagement.updateRole({
          userId: targetUser!.id,
          newRole: "user",
        })
      ).rejects.toThrow("Solo super administradores pueden modificar roles de administradores");
    });

    it("admin cannot promote users to admin", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      // Create a regular user
      const uniqueEmail = `user-no-promote-${Date.now()}@test.com`;
      await adminCaller.userManagement.create({
        name: "User No Promote",
        email: uniqueEmail,
        role: "user",
      });

      const users = await adminCaller.userManagement.listAll();
      const targetUser = users.find(u => u.email === uniqueEmail);
      expect(targetUser).toBeDefined();

      // Try to promote to admin
      await expect(
        adminCaller.userManagement.updateRole({
          userId: targetUser!.id,
          newRole: "admin",
        })
      ).rejects.toThrow("Solo super administradores pueden asignar roles de administrador");
    });

    it("super_admin can modify any role", async () => {
      const superAdminCtx = createSuperAdminContext();
      const superAdminCaller = appRouter.createCaller(superAdminCtx);

      // Create a regular user
      const uniqueEmail = `user-promote-${Date.now()}@test.com`;
      await superAdminCaller.userManagement.create({
        name: "User To Promote",
        email: uniqueEmail,
        role: "user",
      });

      const users = await superAdminCaller.userManagement.listAll();
      const targetUser = users.find(u => u.email === uniqueEmail);
      expect(targetUser).toBeDefined();

      // Promote to admin
      const result = await superAdminCaller.userManagement.updateRole({
        userId: targetUser!.id,
        newRole: "admin",
      });

      expect(result.success).toBe(true);
    });
  });
});
