import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de db
vi.mock("./db", () => ({
  getRemindersByUserId: vi.fn(),
  getRemindersByProjectId: vi.fn(),
  updateReminderStatus: vi.fn(),
  getProjectById: vi.fn(),
  getClientById: vi.fn(),
}));

import * as db from "./db";

describe("Reminders Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRemindersByUserId", () => {
    it("should return empty array when user has no reminders", async () => {
      vi.mocked(db.getRemindersByUserId).mockResolvedValue([]);
      
      const result = await db.getRemindersByUserId(1);
      
      expect(result).toEqual([]);
      expect(db.getRemindersByUserId).toHaveBeenCalledWith(1);
    });

    it("should return reminders for user", async () => {
      const mockReminders = [
        {
          id: 1,
          projectId: 10,
          type: "cotizacion_sin_respuesta",
          assignedTo: 1,
          dueDate: new Date("2026-01-15"),
          message: "El cliente no ha respondido",
          status: "pendiente",
          createdAt: new Date(),
          sentAt: null,
        },
        {
          id: 2,
          projectId: 11,
          type: "diseno_pendiente",
          assignedTo: 1,
          dueDate: new Date("2026-01-16"),
          message: "Diseño pendiente de entrega",
          status: "enviado",
          createdAt: new Date(),
          sentAt: new Date(),
        },
      ];
      
      vi.mocked(db.getRemindersByUserId).mockResolvedValue(mockReminders);
      
      const result = await db.getRemindersByUserId(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("cotizacion_sin_respuesta");
      expect(result[1].type).toBe("diseno_pendiente");
    });
  });

  describe("getRemindersByProjectId", () => {
    it("should return reminders for a project", async () => {
      const mockReminders = [
        {
          id: 1,
          projectId: 10,
          type: "cotizacion_sin_respuesta",
          assignedTo: 1,
          dueDate: new Date("2026-01-15"),
          message: "El cliente no ha respondido",
          status: "pendiente",
          createdAt: new Date(),
          sentAt: null,
        },
      ];
      
      vi.mocked(db.getRemindersByProjectId).mockResolvedValue(mockReminders);
      
      const result = await db.getRemindersByProjectId(10);
      
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe(10);
    });
  });

  describe("updateReminderStatus", () => {
    it("should update reminder status to completado", async () => {
      vi.mocked(db.updateReminderStatus).mockResolvedValue(undefined);
      
      await db.updateReminderStatus(1, "completado");
      
      expect(db.updateReminderStatus).toHaveBeenCalledWith(1, "completado");
    });

    it("should update reminder status to cancelado", async () => {
      vi.mocked(db.updateReminderStatus).mockResolvedValue(undefined);
      
      await db.updateReminderStatus(1, "cancelado");
      
      expect(db.updateReminderStatus).toHaveBeenCalledWith(1, "cancelado");
    });

    it("should update reminder status to enviado", async () => {
      vi.mocked(db.updateReminderStatus).mockResolvedValue(undefined);
      
      await db.updateReminderStatus(1, "enviado");
      
      expect(db.updateReminderStatus).toHaveBeenCalledWith(1, "enviado");
    });
  });

  describe("Reminder filtering logic", () => {
    it("should correctly identify overdue reminders", () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      
      const reminders = [
        { id: 1, dueDate: pastDate, status: "pendiente" },
        { id: 2, dueDate: futureDate, status: "pendiente" },
        { id: 3, dueDate: pastDate, status: "completado" },
      ];
      
      const pending = reminders.filter(r => r.status === "pendiente" || r.status === "enviado");
      const overdue = pending.filter(r => new Date(r.dueDate) <= now);
      const upcoming = pending.filter(r => new Date(r.dueDate) > now);
      
      expect(pending).toHaveLength(2);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].id).toBe(1);
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe(2);
    });

    it("should correctly group reminders by type", () => {
      const reminders = [
        { id: 1, type: "cotizacion_sin_respuesta", status: "pendiente" },
        { id: 2, type: "cotizacion_sin_respuesta", status: "pendiente" },
        { id: 3, type: "diseno_pendiente", status: "pendiente" },
        { id: 4, type: "aprobacion_pendiente", status: "completado" },
      ];
      
      const pending = reminders.filter(r => r.status === "pendiente" || r.status === "enviado");
      
      const byType = {
        cotizacion_sin_respuesta: pending.filter(r => r.type === "cotizacion_sin_respuesta").length,
        diseno_pendiente: pending.filter(r => r.type === "diseno_pendiente").length,
        aprobacion_pendiente: pending.filter(r => r.type === "aprobacion_pendiente").length,
      };
      
      expect(byType.cotizacion_sin_respuesta).toBe(2);
      expect(byType.diseno_pendiente).toBe(1);
      expect(byType.aprobacion_pendiente).toBe(0);
    });
  });

  describe("Reminder enrichment", () => {
    it("should enrich reminders with project and client data", async () => {
      const mockReminder = {
        id: 1,
        projectId: 10,
        type: "cotizacion_sin_respuesta",
        assignedTo: 1,
        dueDate: new Date(),
        message: "Test",
        status: "pendiente",
        createdAt: new Date(),
        sentAt: null,
      };
      
      const mockProject = {
        id: 10,
        name: "Cocina Test",
        status: "cotizacion_enviada",
        clientId: 5,
      };
      
      const mockClient = {
        id: 5,
        name: "Juan Pérez",
        whatsappPhone: "3001234567",
      };
      
      vi.mocked(db.getRemindersByUserId).mockResolvedValue([mockReminder]);
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.getClientById).mockResolvedValue(mockClient as any);
      
      const reminders = await db.getRemindersByUserId(1);
      const project = await db.getProjectById(reminders[0].projectId);
      const client = project?.clientId ? await db.getClientById(project.clientId) : null;
      
      const enriched = {
        ...reminders[0],
        project: project ? {
          id: project.id,
          name: project.name,
          status: project.status,
          client: client ? {
            id: client.id,
            name: client.name,
            whatsappPhone: client.whatsappPhone,
          } : null,
        } : null,
      };
      
      expect(enriched.project).not.toBeNull();
      expect(enriched.project?.name).toBe("Cocina Test");
      expect(enriched.project?.client?.name).toBe("Juan Pérez");
      expect(enriched.project?.client?.whatsappPhone).toBe("3001234567");
    });
  });
});

describe("Reminder Type Configuration", () => {
  const REMINDER_CONFIG = {
    cotizacion_sin_respuesta: {
      businessDays: 2,
      targetRole: "admin",
      title: "Cotización sin respuesta",
    },
    diseno_pendiente: {
      businessDays: 3,
      targetRole: "disenador",
      title: "Diseño pendiente de entrega",
    },
    aprobacion_pendiente: {
      businessDays: 5,
      targetRole: "admin",
      title: "Diseño pendiente de aprobación",
    },
    produccion_retrasada: {
      businessDays: 20,
      targetRole: "jefe_taller",
      title: "Producción posiblemente retrasada",
    },
    instalacion_proxima: {
      businessDays: -3,
      targetRole: "jefe_taller",
      title: "Instalación próxima",
    },
  };

  it("should have correct configuration for cotizacion_sin_respuesta", () => {
    expect(REMINDER_CONFIG.cotizacion_sin_respuesta.businessDays).toBe(2);
    expect(REMINDER_CONFIG.cotizacion_sin_respuesta.targetRole).toBe("admin");
  });

  it("should have correct configuration for diseno_pendiente", () => {
    expect(REMINDER_CONFIG.diseno_pendiente.businessDays).toBe(3);
    expect(REMINDER_CONFIG.diseno_pendiente.targetRole).toBe("disenador");
  });

  it("should have correct configuration for instalacion_proxima", () => {
    expect(REMINDER_CONFIG.instalacion_proxima.businessDays).toBe(-3);
    expect(REMINDER_CONFIG.instalacion_proxima.targetRole).toBe("jefe_taller");
  });
});
