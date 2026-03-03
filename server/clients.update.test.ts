import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db_module from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("clients.update", () => {
  let testClientId: number;
  let testUserId: number;
  let adminContext: TrpcContext;

  beforeAll(async () => {
    // Crear usuario admin de prueba
    testUserId = await db_module.createUserExtended({
      name: "Test Admin",
      email: "admin-update-test@test.com",
      role: "admin",
      passwordHash: "hash",
    });

    // Crear cliente de prueba
    testClientId = await db_module.createClient({
      name: "Original Name",
      email: "original@test.com",
      whatsappPhone: "3001234567",
      address: "Original Address",
    });

    // Crear contexto autenticado
    adminContext = {
      user: {
        id: testUserId,
        openId: "test-admin",
        email: "admin-update-test@test.com",
        name: "Test Admin",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testClientId) {
      await db_module.deleteClient(testClientId);
    }
    if (testUserId) {
      await db_module.deleteUser(testUserId);
    }
  });

  it("debe actualizar cliente con todos los campos", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.clients.update({
      id: testClientId,
      name: "Updated Name",
      email: "updated@test.com",
      whatsappPhone: "3009876543",
      address: "Updated Address",
    });

    expect(result.success).toBe(true);

    // Verificar que los datos se guardaron
    const updated = await db_module.getClientById(testClientId);
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.email).toBe("updated@test.com");
    expect(updated?.whatsappPhone).toBe("3009876543");
    expect(updated?.address).toBe("Updated Address");
  });

  it("debe permitir email vacío", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.clients.update({
      id: testClientId,
      email: "",
    });

    expect(result.success).toBe(true);

    // Verificar que email es null
    const updated = await db_module.getClientById(testClientId);
    expect(updated?.email).toBeNull();
  });

  it("debe permitir actualizar solo algunos campos", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.clients.update({
      id: testClientId,
      name: "New Name Only",
    });

    expect(result.success).toBe(true);

    // Verificar que solo el nombre cambió
    const updated = await db_module.getClientById(testClientId);
    expect(updated?.name).toBe("New Name Only");
  });

  it("debe rechazar si no tiene permisos", async () => {
    const userContext: TrpcContext = {
      user: {
        id: testUserId,
        openId: "test-user",
        email: "user@test.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };

    const caller = appRouter.createCaller(userContext);

    try {
      await caller.clients.update({
        id: testClientId,
        name: "Should Fail",
      });
      expect.fail("Debería haber lanzado error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("debe validar email si se proporciona", async () => {
    const caller = appRouter.createCaller(adminContext);

    try {
      await caller.clients.update({
        id: testClientId,
        email: "invalid-email",
      });
      expect.fail("Debería haber validado email");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });
});
