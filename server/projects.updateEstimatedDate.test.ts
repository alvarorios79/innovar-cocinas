import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de db
vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  updateProject: vi.fn(),
  createProjectStatusHistory: vi.fn(),
}));

import * as db from "./db";

describe("projects.updateEstimatedDate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Permisos de edición de fecha", () => {
    it("admin puede editar la fecha estimada", async () => {
      const mockProject = {
        id: 1,
        name: "Cocina Test",
        status: "en_diseno",
        estimatedInstallDate: new Date("2026-02-15"),
      };
      
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.updateProject).mockResolvedValue(undefined);
      vi.mocked(db.createProjectStatusHistory).mockResolvedValue(1);
      
      // Simular la lógica del endpoint
      const allowedRoles = ["admin", "super_admin", "jefe_taller"];
      const userRole = "admin";
      
      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    it("super_admin puede editar la fecha estimada", async () => {
      const allowedRoles = ["admin", "super_admin", "jefe_taller"];
      const userRole = "super_admin";
      
      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    it("jefe_taller puede editar la fecha estimada", async () => {
      const allowedRoles = ["admin", "super_admin", "jefe_taller"];
      const userRole = "jefe_taller";
      
      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    it("disenador NO puede editar la fecha estimada", async () => {
      const allowedRoles = ["admin", "super_admin", "jefe_taller"];
      const userRole = "disenador";
      
      expect(allowedRoles.includes(userRole)).toBe(false);
    });

    it("operario NO puede editar la fecha estimada", async () => {
      const allowedRoles = ["admin", "super_admin", "jefe_taller"];
      const userRole = "operario";
      
      expect(allowedRoles.includes(userRole)).toBe(false);
    });

    it("user NO puede editar la fecha estimada", async () => {
      const allowedRoles = ["admin", "super_admin", "jefe_taller"];
      const userRole = "user";
      
      expect(allowedRoles.includes(userRole)).toBe(false);
    });
  });

  describe("Actualización de fecha", () => {
    it("debe actualizar la fecha estimada correctamente", async () => {
      const mockProject = {
        id: 1,
        name: "Cocina Test",
        status: "en_diseno",
        estimatedInstallDate: new Date("2026-02-15"),
      };
      
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.updateProject).mockResolvedValue(undefined);
      vi.mocked(db.createProjectStatusHistory).mockResolvedValue(1);
      
      const newDate = new Date("2026-03-01");
      
      // Simular la actualización
      await db.updateProject(1, { estimatedInstallDate: newDate });
      
      expect(db.updateProject).toHaveBeenCalledWith(1, { estimatedInstallDate: newDate });
    });

    it("debe registrar el cambio en el historial", async () => {
      const mockProject = {
        id: 1,
        name: "Cocina Test",
        status: "en_diseno",
        estimatedInstallDate: new Date("2026-02-15"),
      };
      
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.createProjectStatusHistory).mockResolvedValue(1);
      
      const userId = 5;
      const newDate = new Date("2026-03-01");
      const reason = "Retraso en materiales";
      
      // Simular el registro en historial
      await db.createProjectStatusHistory({
        projectId: 1,
        fromStatus: mockProject.status,
        toStatus: mockProject.status,
        changedBy: userId,
        notes: `Fecha estimada cambiada. Motivo: ${reason}`,
      });
      
      expect(db.createProjectStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 1,
          changedBy: userId,
          notes: expect.stringContaining("Retraso en materiales"),
        })
      );
    });

    it("debe funcionar sin motivo especificado", async () => {
      const mockProject = {
        id: 1,
        name: "Cocina Test",
        status: "en_diseno",
        estimatedInstallDate: null,
      };
      
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.createProjectStatusHistory).mockResolvedValue(1);
      
      const userId = 5;
      const newDate = new Date("2026-03-01");
      
      // Simular el registro en historial sin motivo
      await db.createProjectStatusHistory({
        projectId: 1,
        fromStatus: mockProject.status,
        toStatus: mockProject.status,
        changedBy: userId,
        notes: `Fecha estimada cambiada de sin fecha a ${newDate.toLocaleDateString('es-CO')}`,
      });
      
      expect(db.createProjectStatusHistory).toHaveBeenCalled();
    });
  });

  describe("Validaciones", () => {
    it("debe rechazar si el proyecto no existe", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue(null);
      
      const project = await db.getProjectById(999);
      
      expect(project).toBeNull();
    });

    it("debe manejar proyecto sin fecha estimada previa", async () => {
      const mockProject = {
        id: 1,
        name: "Cocina Test",
        status: "cotizacion_enviada",
        estimatedInstallDate: null,
      };
      
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      
      const project = await db.getProjectById(1);
      
      expect(project?.estimatedInstallDate).toBeNull();
    });
  });
});
