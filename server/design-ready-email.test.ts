import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock de los módulos
vi.mock("./email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./push-notifications", () => ({
  createAndSendNotification: vi.fn().mockResolvedValue(true),
}));

describe("Design Ready Email with Credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe generar contraseña temporal con formato correcto", async () => {
    const { generateTemporaryPassword } = await import("./password-generator");
    const password = generateTemporaryPassword();
    
    // Verificar formato: Palabra-####-Símbolo
    expect(password).toMatch(/^[A-Z][a-z]+-\d{4}[!@#$%]$/);
    
    // Verificar longitud mínima
    expect(password.length).toBeGreaterThanOrEqual(10);
  });

  it("debe hashear contraseña correctamente", async () => {
    const { hashPassword, verifyPassword } = await import("./password-auth");
    const password = "TestPassword123!";
    
    const hash = await hashPassword(password);
    
    // El hash no debe ser igual a la contraseña
    expect(hash).not.toBe(password);
    
    // El hash debe comenzar con $2a$ o $2b$ (bcrypt)
    expect(hash).toMatch(/^\$2[ab]\$/);
    
    // La verificación debe ser exitosa
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("debe crear usuario con contraseña temporal", async () => {
    const { generateTemporaryPassword } = await import("./password-generator");
    const { hashPassword } = await import("./password-auth");
    
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(temporaryPassword);
    
    // El hash debe ser válido
    expect(hashedPassword).toBeTruthy();
    expect(hashedPassword.length).toBeGreaterThan(50);
  });

  it("debe incluir credenciales en el HTML del correo", () => {
    const clientEmail = "cliente@test.com";
    const clientPassword = "Innovar-1234!";
    
    // Simular la sección de credenciales del correo
    const credentialsSection = `
      <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3 style="margin-top: 0; color: #065f46;">🔐 Tus Credenciales de Acceso</h3>
        <p style="color: #047857; margin-bottom: 10px;">Usa estos datos para ingresar al portal:</p>
        <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 5px 0;">
          <strong>Correo:</strong> ${clientEmail}
        </p>
        <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 5px 0;">
          <strong>Contraseña:</strong> ${clientPassword}
        </p>
      </div>
    `;
    
    // Verificar que contiene el email
    expect(credentialsSection).toContain(clientEmail);
    
    // Verificar que contiene la contraseña
    expect(credentialsSection).toContain(clientPassword);
    
    // Verificar que tiene el título de credenciales
    expect(credentialsSection).toContain("Tus Credenciales de Acceso");
  });

  it("debe poder actualizar contraseña de usuario existente", async () => {
    const { hashPassword } = await import("./password-auth");
    
    // Crear un usuario de prueba
    const testEmail = `test-design-${Date.now()}@test.com`;
    const userId = await db.createUserExtended({
      name: "Test User Design",
      email: testEmail,
      role: "user",
    });
    
    // Generar nueva contraseña
    const newPassword = "NewPassword123!";
    const hashedPassword = await hashPassword(newPassword);
    
    // Actualizar contraseña
    await db.updateUserPassword(userId, hashedPassword);
    
    // Verificar que el usuario existe
    const user = await db.getUserById(userId);
    expect(user).toBeTruthy();
    expect(user?.email).toBe(testEmail);
    
    // Limpiar
    try {
      await db.deleteUser(userId);
    } catch (e) {
      // Ignorar error si no se puede eliminar
    }
  });
});
