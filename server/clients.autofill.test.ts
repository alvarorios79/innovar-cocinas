import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

describe("Auto-fill de datos de cliente", () => {
  let testClientId: number;

  beforeAll(async () => {
    // Crear un cliente de prueba
    testClientId = await db.createClient({
      name: "Cliente Test Autofill",
      email: "autofill@test.com",
      whatsappPhone: "3009998888",
      address: "Calle Test 123",
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testClientId) {
      await db.deleteClient(testClientId);
    }
  });

  it("debe retornar datos del cliente por WhatsApp", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-open-id",
        name: "Usuario Test",
        role: "user",
      },
      req: {} as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    // Obtener o crear cliente por WhatsApp
    const result = await caller.clients.getOrCreateByWhatsApp({
      name: "Cliente Test Autofill",
      email: "autofill@test.com",
      whatsappPhone: "3009998888",
      address: "Calle Test 123",
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Cliente Test Autofill");
    expect(result?.email).toBe("autofill@test.com");
    expect(result?.whatsappPhone).toBe("3009998888");
    expect(result?.address).toBe("Calle Test 123");
  });

  it("debe retornar undefined cuando el usuario no tiene cliente asociado", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 88888, // Usuario sin cliente asociado
        openId: "test-open-id-2",
        name: "Usuario Sin Cliente",
        role: "user",
      },
      req: {} as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clients.getMyProfile();

    expect(result).toBeUndefined();
  });

  it("debe retornar el mismo cliente si ya existe por WhatsApp", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-open-id",
        name: "Usuario Test",
        role: "user",
      },
      req: {} as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    // Primera llamada crea el cliente
    const firstResult = await caller.clients.getOrCreateByWhatsApp({
      name: "Cliente Duplicado",
      email: "duplicado@test.com",
      whatsappPhone: "3007776666",
      address: "Dirección Original",
    });

    // Segunda llamada debe retornar el mismo cliente
    const secondResult = await caller.clients.getOrCreateByWhatsApp({
      name: "Cliente Duplicado Modificado",
      email: "nuevo@test.com",
      whatsappPhone: "3007776666", // Mismo teléfono
      address: "Nueva Dirección",
    });

    expect(firstResult?.id).toBe(secondResult?.id);
    expect(secondResult?.name).toBe("Cliente Duplicado"); // No se actualiza
  });
});
