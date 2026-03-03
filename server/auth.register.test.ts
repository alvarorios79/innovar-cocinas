import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, clients } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock context para tests
function createTestContext() {
  return {
    user: null,
    req: { headers: { host: "localhost:3000" } } as any,
    res: { 
      cookie: () => {},
      clearCookie: () => {} 
    } as any,
  };
}

describe("User Registration and Password Reset", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPass123!";
  const testName = "Test User";
  const testPhone = "3001234567";

  describe("auth.register", () => {
    it("debe registrar un nuevo usuario con email y contraseña", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.register({
        name: testName,
        email: testEmail,
        password: testPassword,
        whatsappPhone: testPhone,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.user.name).toBe(testName);
      expect(result.user.role).toBe("user");
    });

    it("debe rechazar registro con email duplicado", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          name: "Another User",
          email: testEmail, // Email ya usado
          password: testPassword,
          whatsappPhone: "3009876543",
        })
      ).rejects.toThrow("Ya existe una cuenta con este email");
    });

    it("debe rechazar contraseña débil (sin mayúscula)", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          name: "Test User 2",
          email: `test2-${Date.now()}@example.com`,
          password: "testpass123", // Sin mayúscula
          whatsappPhone: "3001111111",
        })
      ).rejects.toThrow("mayúscula");
    });

    it("debe rechazar contraseña débil (sin número)", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          name: "Test User 3",
          email: `test3-${Date.now()}@example.com`,
          password: "TestPassword", // Sin número
          whatsappPhone: "3002222222",
        })
      ).rejects.toThrow("número");
    });

    it("debe rechazar contraseña corta", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          name: "Test User 4",
          email: `test4-${Date.now()}@example.com`,
          password: "Test1", // Muy corta
          whatsappPhone: "3003333333",
        })
      ).rejects.toThrow("8 caracteres");
    });
  });

  describe("auth.requestPasswordReset", () => {
    it("debe aceptar solicitud de reset para email existente", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.requestPasswordReset({
        email: testEmail,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it("debe retornar éxito incluso para email no existente (seguridad)", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.requestPasswordReset({
        email: "noexiste@example.com",
      });

      // Por seguridad, no revelamos si el email existe o no
      expect(result.success).toBe(true);
    });
  });

  describe("auth.resetPassword", () => {
    it("debe rechazar token inválido", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.resetPassword({
          token: "token-invalido-123",
          newPassword: "NewPass123!",
        })
      ).rejects.toThrow("inválido o ha expirado");
    });

    it("debe rechazar nueva contraseña débil", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.resetPassword({
          token: "cualquier-token",
          newPassword: "weak", // Contraseña débil
        })
      ).rejects.toThrow();
    });
  });

  describe("auth.loginWithPassword", () => {
    it("debe permitir login con credenciales correctas después del registro", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.loginWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(result.success).toBe(true);
      expect(result.user.email).toBe(testEmail);
    });

    it("debe rechazar login con contraseña incorrecta", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.loginWithPassword({
          email: testEmail,
          password: "WrongPassword123!",
        })
      ).rejects.toThrow("incorrectos");
    });
  });
});
