import { describe, expect, it } from "vitest";
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

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Clients API", () => {
  it("should create or get client by WhatsApp", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clients.getOrCreateByWhatsApp({
      name: "Test Client",
      email: "test@example.com",
      whatsappPhone: "3001234567",
      address: "Test Address",
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Test Client");
    expect(result?.whatsappPhone).toBe("3001234567");
  });
});

describe("Appointments API", () => {
  it("should create appointment with valid data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Primero crear un cliente
    const client = await caller.clients.getOrCreateByWhatsApp({
      name: "Test Client",
      email: "test@example.com",
      whatsappPhone: "3001234567",
      address: "Test Address",
    });

    if (!client) {
      throw new Error("Failed to create client");
    }

    const result = await caller.appointments.create({
      clientId: client.id,
      workTypes: ["cocina"],
      notes: "Test appointment",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should allow admin to list all appointments", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.appointments.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should prevent non-admin from updating appointment status", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.appointments.updateStatus({
        id: 1,
        status: "confirmada",
      })
    ).rejects.toThrow();
  });
});

describe("Advisory Requests API", () => {
  it("should create advisory request with valid data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Primero crear un cliente
    const client = await caller.clients.getOrCreateByWhatsApp({
      name: "Test Client",
      email: "test@example.com",
      whatsappPhone: "3001234567",
      address: "Test Address",
    });

    if (!client) {
      throw new Error("Failed to create client");
    }

    const result = await caller.advisory.create({
      clientId: client.id,
      workType: "closet",
      notes: "Need advice on closet design",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should allow admin to list all advisory requests", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advisory.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Prior Estimates API", () => {
  it("should create prior estimate with measurements", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Primero crear un cliente
    const client = await caller.clients.getOrCreateByWhatsApp({
      name: "Test Client",
      email: "test@example.com",
      whatsappPhone: "3001234567",
      address: "Test Address",
    });

    if (!client) {
      throw new Error("Failed to create client");
    }

    const result = await caller.estimates.create({
      clientId: client.id,
      workType: "cocina",
      linearLength: 3.5,
      height: 2.4,
      kitchenShape: "L",
      materialType: "quarzone",
      additionalDetails: "Modern kitchen design",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});

describe("Quotations API", () => {
  it("should allow admin to create quotation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Crear cliente primero
    const client = await caller.clients.getOrCreateByWhatsApp({
      name: "Test Client",
      email: "test@example.com",
      whatsappPhone: "3001234567",
      address: "Test Address",
    });

    if (!client) {
      throw new Error("Failed to create client");
    }

    const result = await caller.quotations.create({
      clientId: client.id,
      workType: "cocina",
      description: "Complete kitchen renovation",
      materials: "Premium wood, quartz countertop",
      totalPrice: "5000000",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should prevent non-admin from creating quotation", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.quotations.create({
        clientId: 1,
        workType: "cocina",
        description: "Test",
        totalPrice: "1000000",
      })
    ).rejects.toThrow();
  });

  it("should allow admin to send quotation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Crear cliente y cotización primero
    const client = await caller.clients.getOrCreateByWhatsApp({
      name: "Test Client",
      email: "test@example.com",
      whatsappPhone: "3001234567",
      address: "Test Address",
    });

    if (!client) {
      throw new Error("Failed to create client");
    }

    const quotation = await caller.quotations.create({
      clientId: client.id,
      workType: "cocina",
      description: "Test quotation",
      totalPrice: "1000000",
    });

    const result = await caller.quotations.send({
      id: quotation.id,
    });

    expect(result.success).toBe(true);
    expect(result.whatsappLink).toBeDefined();
  });
});
