import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { hashPassword, validatePasswordStrength, authenticateWithPassword } from "./password-auth";
import { eq } from "drizzle-orm";

describe("Password Authentication", () => {
  let testUserId: number;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123";

  beforeAll(async () => {
    // Crear usuario de prueba con contraseña
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const passwordHash = await hashPassword(testPassword);
    const [result] = await db.insert(users).values({
      openId: `test-${Date.now()}`,
      name: "Test User",
      email: testEmail,
      role: "user",
      loginMethod: "password",
      passwordHash,
      lastSignedIn: new Date(),
    });

    testUserId = result.insertId;
  });

  describe("validatePasswordStrength", () => {
    it("debe rechazar contraseñas cortas", () => {
      const result = validatePasswordStrength("Short1");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("La contraseña debe tener al menos 8 caracteres");
    });

    it("debe rechazar contraseñas sin mayúsculas", () => {
      const result = validatePasswordStrength("password123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("La contraseña debe contener al menos una letra mayúscula");
    });

    it("debe rechazar contraseñas sin minúsculas", () => {
      const result = validatePasswordStrength("PASSWORD123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("La contraseña debe contener al menos una letra minúscula");
    });

    it("debe rechazar contraseñas sin números", () => {
      const result = validatePasswordStrength("PasswordOnly");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("La contraseña debe contener al menos un número");
    });

    it("debe aceptar contraseñas válidas", () => {
      const result = validatePasswordStrength("ValidPassword123");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("authenticateWithPassword", () => {
    it("debe autenticar con credenciales correctas", async () => {
      const user = await authenticateWithPassword(testEmail, testPassword);
      expect(user).not.toBeNull();
      expect(user?.email).toBe(testEmail);
      expect(user?.id).toBe(testUserId);
    });

    it("debe rechazar contraseña incorrecta", async () => {
      const user = await authenticateWithPassword(testEmail, "WrongPassword123");
      expect(user).toBeNull();
    });

    it("debe rechazar email inexistente", async () => {
      const user = await authenticateWithPassword("nonexistent@example.com", testPassword);
      expect(user).toBeNull();
    });
  });

  describe("userManagement.create con contraseña", () => {
    it("debe permitir a super_admin crear usuario con contraseña", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "super_admin", name: "Super Admin", email: "admin@test.com" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.userManagement.create({
        name: "Test Password User",
        email: `password-user-${Date.now()}@example.com`,
        role: "user",
        password: "SecurePass123",
      });

      expect(result.success).toBe(true);
    });

    it("debe rechazar contraseña débil", async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: "super_admin", name: "Super Admin", email: "admin@test.com" },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.userManagement.create({
          name: "Test User",
          email: `weak-pass-${Date.now()}@example.com`,
          role: "user",
          password: "weak",
        })
      ).rejects.toThrow();
    });

    it("debe rechazar creación con contraseña si no es super_admin", async () => {
      const caller = appRouter.createCaller({
        user: { id: 2, role: "admin", name: "Admin", email: "admin2@test.com" },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.userManagement.create({
          name: "Test User",
          email: `no-super-${Date.now()}@example.com`,
          role: "user",
          password: "SecurePass123",
        })
      ).rejects.toThrow("Solo super administradores pueden crear usuarios con contraseña");
    });
  });
});
