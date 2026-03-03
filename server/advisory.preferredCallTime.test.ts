import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Advisory Requests - Preferred Call Time", () => {
  let testClientId: number;

  beforeAll(async () => {
    // Crear un cliente de prueba
    testClientId = await db.createClient({
      name: "Test Client Advisory",
      whatsappPhone: "3001234567",
      email: "test@advisory.com",
      address: "Test Address",
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    const advisoryRequests = await db.getAllAdvisoryRequests();
    for (const req of advisoryRequests) {
      if (req.clientId === testClientId) {
        await db.deleteAdvisoryRequest(req.id);
      }
    }
    await db.deleteClient(testClientId);
  });

  it("should create advisory request with preferred call time", async () => {
    const caller = appRouter.createCaller({ user: null });
    
    const result = await caller.advisory.create({
      clientId: testClientId,
      workType: "cocina",
      preferredCallTime: "morning",
      notes: "Necesito asesoramiento sobre cocinas en L",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();

    // Verificar que se guardó correctamente
    const requests = await db.getAdvisoryRequestsByClientId(testClientId);
    const savedRequest = requests.find(r => r.id === result.id);
    
    expect(savedRequest).toBeDefined();
    expect(savedRequest?.preferredCallTime).toBe("morning");
    expect(savedRequest?.notes).toBe("Necesito asesoramiento sobre cocinas en L");
  });

  it("should create advisory request without preferred call time (optional)", async () => {
    const caller = appRouter.createCaller({ user: null });
    
    const result = await caller.advisory.create({
      clientId: testClientId,
      workType: "closet",
      notes: "Consulta sobre closets",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();

    // Verificar que se guardó correctamente sin el campo opcional
    const requests = await db.getAdvisoryRequestsByClientId(testClientId);
    const savedRequest = requests.find(r => r.id === result.id);
    
    expect(savedRequest).toBeDefined();
    expect(savedRequest?.preferredCallTime).toBeNull();
  });

  it("should accept all valid call time options", async () => {
    const caller = appRouter.createCaller({ user: null });
    const callTimes = ["morning", "afternoon", "evening", "anytime"];

    for (const callTime of callTimes) {
      const result = await caller.advisory.create({
        clientId: testClientId,
        workType: "puertas",
        preferredCallTime: callTime,
        notes: `Testing ${callTime}`,
      });

      expect(result.success).toBe(true);
      
      const requests = await db.getAdvisoryRequestsByClientId(testClientId);
      const savedRequest = requests.find(r => r.id === result.id);
      expect(savedRequest?.preferredCallTime).toBe(callTime);
    }
  });

  it("should include preferred call time in WhatsApp notification", async () => {
    const caller = appRouter.createCaller({ user: null });
    
    const result = await caller.advisory.create({
      clientId: testClientId,
      workType: "centro_tv",
      preferredCallTime: "afternoon",
      notes: "Consulta sobre centro de TV",
    });

    expect(result.whatsappLink).toBeDefined();
    expect(result.whatsappLink).toContain("SOLICITUD%20DE%20ASESORAMIENTO");
    expect(result.whatsappLink).toContain("Tarde"); // Verificar que incluye el horario traducido
  });
});
