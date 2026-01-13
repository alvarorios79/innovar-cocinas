import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Delete Endpoints", () => {
  describe("appointments.delete", () => {
    it("should allow admin to delete appointment", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "admin", name: "Admin", email: "admin@test.com", openId: "admin123" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.appointments.delete({ id: 999 });
      expect(result.success).toBe(true);
    });

    it("should allow super_admin to delete appointment", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "super_admin", name: "Super", email: "super@test.com", openId: "super123" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.appointments.delete({ id: 999 });
      expect(result.success).toBe(true);
    });

    it("should reject user trying to delete appointment", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "user", name: "User", email: "user@test.com", openId: "user123" },
        req: {} as any,
        res: {} as any,
      });

      await expect(caller.appointments.delete({ id: 999 })).rejects.toThrow("No tienes permisos para eliminar citas");
    });
  });

  describe("advisory.delete", () => {
    it("should allow admin to delete advisory request", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "admin", name: "Admin", email: "admin@test.com", openId: "admin123" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.advisory.delete({ id: 999 });
      expect(result.success).toBe(true);
    });

    it("should reject user trying to delete advisory request", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "user", name: "User", email: "user@test.com", openId: "user123" },
        req: {} as any,
        res: {} as any,
      });

      await expect(caller.advisory.delete({ id: 999 })).rejects.toThrow("No tienes permisos para eliminar asesoramientos");
    });
  });

  describe("quotations.delete", () => {
    it("should allow admin to delete quotation", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "admin", name: "Admin", email: "admin@test.com", openId: "admin123" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.quotations.delete({ id: 999 });
      expect(result.success).toBe(true);
    });

    it("should reject user trying to delete quotation", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "user", name: "User", email: "user@test.com", openId: "user123" },
        req: {} as any,
        res: {} as any,
      });

      await expect(caller.quotations.delete({ id: 999 })).rejects.toThrow("No tienes permisos para eliminar cotizaciones");
    });
  });

  describe("clients.delete", () => {
    it("should allow admin to delete client", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "admin", name: "Admin", email: "admin@test.com", openId: "admin123" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.clients.delete({ id: 999 });
      expect(result.success).toBe(true);
    });

    it("should allow super_admin to delete client", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "super_admin", name: "Super", email: "super@test.com", openId: "super123" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.clients.delete({ id: 999 });
      expect(result.success).toBe(true);
    });

    it("should reject user trying to delete client", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "user", name: "User", email: "user@test.com", openId: "user123" },
        req: {} as any,
        res: {} as any,
      });

      await expect(caller.clients.delete({ id: 999 })).rejects.toThrow("No tienes permisos para eliminar clientes");
    });
  });
});
