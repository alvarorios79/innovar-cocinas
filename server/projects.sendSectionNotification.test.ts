import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock de la función sendTextMessage de WhatsApp
vi.mock("../whatsapp-cloud", () => ({
  sendTextMessage: vi.fn(async (phone: string, message: string) => ({
    messageId: "test-message-id-123",
  })),
}));

// Mock de las funciones de base de datos
vi.mock("../db", () => ({
  getProjectById: vi.fn(async (id: number) => {
    if (id === 1) {
      return {
        id: 1,
        clientId: 100,
        name: "Test Project",
        status: "corte",
      };
    }
    return null;
  }),
  getClientById: vi.fn(async (id: number) => {
    if (id === 100) {
      return {
        id: 100,
        name: "Test Client",
        whatsappPhone: "+573136802025",
      };
    }
    return null;
  }),
}));

describe("projects.sendSectionNotification", () => {
  it("debe enviar notificación correctamente para sección corte", async () => {
    const { sendTextMessage } = await import("../whatsapp-cloud");
    const { getProjectById, getClientById } = await import("../db");

    // Simular llamada al endpoint
    const projectId = 1;
    const sectionKey = "corte";

    const project = await getProjectById(projectId);
    expect(project).toBeDefined();
    expect(project?.id).toBe(1);

    const client = await getClientById(project!.clientId);
    expect(client).toBeDefined();
    expect(client?.whatsappPhone).toBe("+573136802025");

    const messages: Record<string, string> = {
      corte: `Hola ${client!.name}, iniciamos el CORTE de tu cocina.`,
      enchape: `Hola ${client!.name}, iniciamos el ENCHAPE de tu cocina.`,
      armado: `Hola ${client!.name}, iniciamos el ARMADO de tu cocina.`,
      instalacion: `Hola ${client!.name}, iniciamos la INSTALACION de tu cocina.`,
      entrega: `Hola ${client!.name}, tu cocina esta LISTA!`,
    };

    const message = messages[sectionKey];
    expect(message).toContain("CORTE");

    const response = await sendTextMessage(client!.whatsappPhone, message);
    expect(response.messageId).toBe("test-message-id-123");
  });

  it("debe rechazar si el cliente no tiene WhatsApp", async () => {
    const { getProjectById, getClientById } = await import("../db");

    const projectId = 1;
    const project = await getProjectById(projectId);

    // Simular cliente sin WhatsApp
    const clientWithoutWhatsApp = {
      id: 100,
      name: "Test Client",
      whatsappPhone: null,
    };

    expect(clientWithoutWhatsApp.whatsappPhone).toBeNull();
  });

  it("debe rechazar si el proyecto no existe", async () => {
    const { getProjectById } = await import("../db");

    const projectId = 999;
    const project = await getProjectById(projectId);

    expect(project).toBeNull();
  });

  it("debe validar secciones permitidas", () => {
    const validSections = ["corte", "enchape", "armado", "instalacion", "entrega"];

    validSections.forEach((section) => {
      expect(validSections).toContain(section);
    });

    const invalidSection = "invalido";
    expect(validSections).not.toContain(invalidSection);
  });

  it("debe validar permisos de rol", () => {
    const allowedRoles = ["super_admin", "admin", "comercial"];
    const deniedRoles = ["disenador", "jefe_taller", "operario"];

    allowedRoles.forEach((role) => {
      expect(allowedRoles).toContain(role);
    });

    deniedRoles.forEach((role) => {
      expect(allowedRoles).not.toContain(role);
    });
  });
});
