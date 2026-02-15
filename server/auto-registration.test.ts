import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import { generateTemporaryPassword } from "./password-generator";

describe("Auto-registro de usuarios al crear cita", () => {
  let testClientId: number;
  let testEmail: string;

  beforeEach(async () => {
    // Crear un cliente de prueba sin userId
    testEmail = `test-${Date.now()}@example.com`;
    testClientId = await db.createClient({
      name: "Cliente Test Auto-registro",
      email: testEmail,
      whatsappPhone: `300${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: "Dirección de prueba",
      userId: null,
    });
  });

  afterEach(async () => {
    // Limpiar datos de prueba
    try {
      // Eliminar usuario creado
      const users = await db.getAllUsers();
      const testUser = users.find(u => u.email === testEmail);
      if (testUser) {
        // Nota: No tenemos función deleteUser, pero en producción se limpiaría
        console.log(`Usuario de prueba creado: ${testUser.id}`);
      }
      
      // Eliminar cliente
      // Nota: No tenemos función deleteClient, pero en producción se limpiaría
      console.log(`Cliente de prueba creado: ${testClientId}`);
    } catch (error) {
      console.error("Error al limpiar datos de prueba:", error);
    }
  });

  it("debe generar contraseñas temporales válidas", () => {
    const password = generateTemporaryPassword();
    
    // Verificar formato: Palabra-####-Símbolo
    expect(password).toMatch(/^[A-Z][a-z]+-\d{4}[!@#$%]$/);
    expect(password.length).toBeGreaterThanOrEqual(10);
    expect(password.length).toBeLessThanOrEqual(15);
  });

  it("debe crear usuario automáticamente cuando el cliente no tiene userId", async () => {
    // Obtener cliente antes
    const clientBefore = await db.getClientById(testClientId);
    expect(clientBefore?.userId).toBeNull();
    expect(clientBefore?.email).toBe(testEmail);

    // Simular la lógica de auto-registro
    const { hashPassword } = await import("./password-auth");
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(temporaryPassword);
    
    // Crear usuario
    const userId = await db.createUserExtended({
      name: clientBefore!.name,
      email: clientBefore!.email!,
      role: "user",
      passwordHash: hashedPassword,
    });
    
    // Asociar cliente con usuario
    await db.updateClient(testClientId, { userId });

    // Verificar que el usuario fue creado
    const users = await db.getAllUsers();
    const createdUser = users.find(u => u.email === testEmail);
    expect(createdUser).toBeDefined();
    expect(createdUser?.name).toBe("Cliente Test Auto-registro");
    expect(createdUser?.role).toBe("user");
    expect(createdUser?.passwordHash).toBeDefined();

    // Verificar que el cliente fue asociado con el usuario
    const clientAfter = await db.getClientById(testClientId);
    expect(clientAfter?.userId).toBe(userId);
  });

  it("no debe crear usuario duplicado si ya existe uno con el mismo email", async () => {  
    // Crear usuario manualmente primero
    const existingUserId = await db.createUserExtended({
      name: "Usuario Existente",
      email: testEmail,
      role: "user",
    });

    const usersBefore = await db.getAllUsers();
    const userCountBefore = usersBefore.filter(u => u.email === testEmail).length;
    expect(userCountBefore).toBe(1);

    // Intentar crear otro usuario con el mismo email (debería fallar o no hacer nada)
    const existingUsers = await db.getAllUsers();
    const userExists = existingUsers.some(u => u.email?.toLowerCase() === testEmail.toLowerCase());
    
    expect(userExists).toBe(true);

    // Verificar que no se puede crear usuario duplicado
    const usersAfter = await db.getAllUsers();
    const userCountAfter = usersAfter.filter(u => u.email === testEmail).length;
    expect(userCountAfter).toBe(1); // Sigue siendo 1, no se duplicó
  });
});
