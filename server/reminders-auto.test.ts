import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de db
vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  createReminder: vi.fn(),
  cancelProjectReminders: vi.fn(),
  getUsersByRole: vi.fn(),
}));

// Mock de business-days
vi.mock("./business-days", () => ({
  addBusinessDays: vi.fn((date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return Promise.resolve(result);
  }),
}));

import * as db from "./db";
import { createRemindersForStatusChange, REMINDER_CONFIG } from "./reminders-service";

describe("Recordatorios Automáticos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.cancelProjectReminders).mockResolvedValue(undefined);
    vi.mocked(db.createReminder).mockResolvedValue(1);
  });

  describe("createRemindersForStatusChange", () => {
    const mockProject = {
      name: "Cocina Test",
      createdBy: 1,
      designerId: 2,
      clientId: 3,
    };

    it("debe cancelar recordatorios anteriores al cambiar estado", async () => {
      await createRemindersForStatusChange(10, "cotizacion_enviada", mockProject);
      
      expect(db.cancelProjectReminders).toHaveBeenCalledWith(10);
    });

    it("debe crear recordatorio de cotización sin respuesta al enviar cotización", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue({ name: "Cocina Test" } as any);
      
      await createRemindersForStatusChange(10, "cotizacion_enviada", mockProject);
      
      expect(db.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 10,
          type: "cotizacion_sin_respuesta",
          assignedTo: 1, // createdBy (admin/comercial)
          status: "pendiente",
        })
      );
    });

    it("debe crear recordatorio de diseño pendiente al recibir adelanto", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue({ name: "Cocina Test" } as any);
      
      await createRemindersForStatusChange(10, "adelanto_recibido", mockProject);
      
      expect(db.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 10,
          type: "diseno_pendiente",
          assignedTo: 2, // designerId
          status: "pendiente",
        })
      );
    });

    it("debe crear recordatorio al admin si no hay diseñador asignado", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue({ name: "Cocina Test" } as any);
      const projectSinDisenador = { ...mockProject, designerId: null };
      
      await createRemindersForStatusChange(10, "adelanto_recibido", projectSinDisenador);
      
      expect(db.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 10,
          type: "diseno_pendiente",
          assignedTo: 1, // createdBy (admin)
          status: "pendiente",
        })
      );
    });

    it("debe crear recordatorio de aprobación pendiente cuando diseño está listo", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue({ name: "Cocina Test" } as any);
      
      await createRemindersForStatusChange(10, "pendiente_render", mockProject);
      
      expect(db.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 10,
          type: "aprobacion_pendiente",
          assignedTo: 1, // createdBy (admin/comercial)
          status: "pendiente",
        })
      );
    });

    it("debe crear recordatorio de producción retrasada al aprobar diseño", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue({ name: "Cocina Test" } as any);
      vi.mocked(db.getUsersByRole).mockResolvedValue([{ id: 5, name: "Jefe Taller" } as any]);
      
      await createRemindersForStatusChange(10, "aprobacion_final", mockProject);
      
      expect(db.getUsersByRole).toHaveBeenCalledWith("jefe_taller");
      expect(db.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 10,
          type: "produccion_retrasada",
          assignedTo: 5, // jefe_taller
          status: "pendiente",
        })
      );
    });

    it("debe crear recordatorio de instalación próxima al programar instalación", async () => {
      const installDate = new Date();
      installDate.setDate(installDate.getDate() + 10); // 10 días en el futuro
      
      vi.mocked(db.getProjectById).mockResolvedValue({ 
        name: "Cocina Test",
        scheduledInstallDate: installDate,
      } as any);
      vi.mocked(db.getUsersByRole).mockResolvedValue([{ id: 5, name: "Jefe Taller" } as any]);
      
      await createRemindersForStatusChange(10, "listo_instalacion", mockProject);
      
      expect(db.getUsersByRole).toHaveBeenCalledWith("jefe_taller");
      expect(db.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 10,
          type: "instalacion_proxima",
          assignedTo: 5,
          status: "pendiente",
        })
      );
    });

    it("no debe crear recordatorio de instalación si la fecha ya pasó", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 días en el pasado
      
      vi.mocked(db.getProjectById).mockResolvedValue({ 
        name: "Cocina Test",
        scheduledInstallDate: pastDate,
      } as any);
      vi.mocked(db.getUsersByRole).mockResolvedValue([{ id: 5, name: "Jefe Taller" } as any]);
      
      await createRemindersForStatusChange(10, "listo_instalacion", mockProject);
      
      // No debe crear recordatorio porque la fecha de aviso ya pasó
      expect(db.createReminder).not.toHaveBeenCalled();
    });
  });

  describe("REMINDER_CONFIG", () => {
    it("debe tener configuración correcta para cotización sin respuesta", () => {
      expect(REMINDER_CONFIG.cotizacion_sin_respuesta.businessDays).toBe(2);
      expect(REMINDER_CONFIG.cotizacion_sin_respuesta.targetRole).toBe("admin");
    });

    it("debe tener configuración correcta para diseño pendiente", () => {
      expect(REMINDER_CONFIG.diseno_pendiente.businessDays).toBe(3);
      expect(REMINDER_CONFIG.diseno_pendiente.targetRole).toBe("disenador");
    });

    it("debe tener configuración correcta para aprobación pendiente", () => {
      expect(REMINDER_CONFIG.aprobacion_pendiente.businessDays).toBe(5);
      expect(REMINDER_CONFIG.aprobacion_pendiente.targetRole).toBe("admin");
    });

    it("debe tener configuración correcta para producción retrasada", () => {
      expect(REMINDER_CONFIG.produccion_retrasada.businessDays).toBe(20);
      expect(REMINDER_CONFIG.produccion_retrasada.targetRole).toBe("jefe_taller");
    });

    it("debe tener configuración correcta para instalación próxima", () => {
      expect(REMINDER_CONFIG.instalacion_proxima.businessDays).toBe(-3);
      expect(REMINDER_CONFIG.instalacion_proxima.targetRole).toBe("jefe_taller");
    });
  });
});
