import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock whatsapp-cloud
vi.mock("./whatsapp-cloud", () => ({
  isWhatsAppCloudConfigured: vi.fn().mockReturnValue(true),
  sendTextMessage: vi.fn().mockResolvedValue({ success: true, messageId: "test-msg-id" }),
  sendBirthdayGreeting: vi.fn().mockResolvedValue({ success: true, messageId: "test-msg-id" }),
}));

// Mock db
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserById: vi.fn().mockResolvedValue(null),
  getPendingReminders: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(null),
  getAllTasks: vi.fn().mockResolvedValue([]),
  getAllProjects: vi.fn().mockResolvedValue([]),
  getUsersByRole: vi.fn().mockResolvedValue([]),
}));

// Mock reminders-service
vi.mock("./reminders-service", () => ({
  REMINDER_CONFIG: {
    cotizacion_sin_respuesta: {
      businessDays: 2,
      targetRole: "admin",
      title: "Cotización sin respuesta",
      getMessage: (name: string) => `Cotización sin respuesta para ${name}`,
    },
  },
}));

import * as whatsappCloud from "./whatsapp-cloud";
import * as db from "./db";
import {
  sendProjectRemindersToTeam,
  sendTaskRemindersToTeam,
  sendOverdueChangesToTeam,
  sendBirthdayWhatsApp,
  startTeamWhatsAppService,
} from "./whatsapp-team-notifications";

describe("Servicio de Notificaciones WhatsApp al Equipo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendProjectRemindersToTeam", () => {
    it("debe retornar 0 si WhatsApp no está configurado", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(false);
      const result = await sendProjectRemindersToTeam();
      expect(result.checked).toBe(0);
      expect(result.sent).toBe(0);
    });

    it("debe retornar 0 si no hay recordatorios pendientes", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      vi.mocked(db.getPendingReminders).mockResolvedValue([]);
      const result = await sendProjectRemindersToTeam();
      expect(result.checked).toBe(0);
      expect(result.sent).toBe(0);
    });

    it("debe enviar WhatsApp cuando hay recordatorios con usuario con teléfono", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      vi.mocked(db.getPendingReminders).mockResolvedValue([
        {
          id: 1,
          projectId: 10,
          assignedTo: 5,
          type: "cotizacion_sin_respuesta",
          message: "Seguimiento necesario",
          status: "pendiente",
          dueDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      vi.mocked(db.getUserById).mockResolvedValue({
        id: 5,
        name: "Martha Serna",
        phone: "3003880244",
        role: "comercial",
      } as any);
      vi.mocked(db.getProjectById).mockResolvedValue({
        id: 10,
        name: "Cocina Moderna",
      } as any);

      const result = await sendProjectRemindersToTeam();
      expect(result.checked).toBe(1);
      expect(result.sent).toBe(1);
      expect(whatsappCloud.sendTextMessage).toHaveBeenCalledWith(
        "3003880244",
        expect.stringContaining("Cocina Moderna")
      );
    });

    it("debe saltar usuarios sin teléfono", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      vi.mocked(db.getPendingReminders).mockResolvedValue([
        {
          id: 1,
          projectId: 10,
          assignedTo: 5,
          type: "cotizacion_sin_respuesta",
          message: "Test",
          status: "pendiente",
          dueDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      vi.mocked(db.getUserById).mockResolvedValue({
        id: 5,
        name: "Test User",
        phone: null,
        role: "admin",
      } as any);

      const result = await sendProjectRemindersToTeam();
      expect(result.sent).toBe(0);
      expect(whatsappCloud.sendTextMessage).not.toHaveBeenCalled();
    });
  });

  describe("sendTaskRemindersToTeam", () => {
    it("debe retornar 0 si WhatsApp no está configurado", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(false);
      const result = await sendTaskRemindersToTeam();
      expect(result.checked).toBe(0);
      expect(result.sent).toBe(0);
    });

    it("debe retornar 0 si no hay tareas próximas a vencer", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      vi.mocked(db.getAllTasks).mockResolvedValue([]);
      const result = await sendTaskRemindersToTeam();
      expect(result.checked).toBe(0);
      expect(result.sent).toBe(0);
    });

    it("debe enviar WhatsApp para tareas que vencen hoy", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      const today = new Date();
      today.setHours(18, 0, 0, 0);
      vi.mocked(db.getAllTasks).mockResolvedValue([
        {
          id: 1,
          title: "Instalar mesón",
          status: "pendiente",
          dueDate: today,
          assignedTo: 3,
          priority: "alta",
        },
      ] as any);
      vi.mocked(db.getUserById).mockResolvedValue({
        id: 3,
        name: "Luis Cardoso",
        phone: "3174266768",
        role: "jefe_taller",
      } as any);

      const result = await sendTaskRemindersToTeam();
      expect(result.checked).toBe(1);
      expect(result.sent).toBe(1);
      expect(whatsappCloud.sendTextMessage).toHaveBeenCalledWith(
        "3174266768",
        expect.stringContaining("Instalar mesón")
      );
    });
  });

  describe("sendOverdueChangesToTeam", () => {
    it("debe retornar 0 si WhatsApp no está configurado", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(false);
      const result = await sendOverdueChangesToTeam();
      expect(result.checked).toBe(0);
      expect(result.sent).toBe(0);
    });

    it("debe retornar 0 si no hay proyectos con cambios pendientes", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      vi.mocked(db.getAllProjects).mockResolvedValue([]);
      const result = await sendOverdueChangesToTeam();
      expect(result.checked).toBe(0);
      expect(result.sent).toBe(0);
    });
  });

  describe("sendBirthdayWhatsApp", () => {
    it("debe retornar 0 si WhatsApp no está configurado", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(false);
      const result = await sendBirthdayWhatsApp();
      expect(result.sent).toBe(0);
      expect(result.errors).toBe(0);
    });

    it("debe retornar 0 si no hay cumpleaños hoy", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      vi.mocked(db.getAllUsers).mockResolvedValue([]);
      const result = await sendBirthdayWhatsApp();
      expect(result.sent).toBe(0);
    });

    it("debe enviar felicitación de cumpleaños por WhatsApp", async () => {
      vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
      const today = new Date();
      vi.mocked(db.getAllUsers).mockResolvedValue([
        {
          id: 1,
          name: "Martha Serna",
          phone: "3003880244",
          birthDate: today,
          role: "comercial",
        },
      ] as any);

      const result = await sendBirthdayWhatsApp();
      expect(result.sent).toBe(1);
      expect(whatsappCloud.sendBirthdayGreeting).toHaveBeenCalledWith(
        "3003880244",
        "Martha"
      );
    });
  });

  describe("startTeamWhatsAppService", () => {
    it("debe exportar startTeamWhatsAppService como función", () => {
      expect(typeof startTeamWhatsAppService).toBe("function");
    });
  });
});
