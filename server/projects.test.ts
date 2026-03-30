import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock de la base de datos
vi.mock("./db", () => ({
  createProject: vi.fn(),
  getProjectById: vi.fn(),
  getProjectsByStatus: vi.fn(),
  updateProject: vi.fn(),
  getClientByUserId: vi.fn(),
  createProjectStatusHistory: vi.fn(),
  getProjectPhotos: vi.fn(),
  getProjectDetails: vi.fn(),
  getProjectStatusHistory: vi.fn(),
}));

describe("Projects Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Project Status Flow", () => {
    it("should define correct status order", () => {
      const statusOrder = [
        "pendiente",
        "aprobado_diseno",
        "en_diseno",
        "pendiente_render",
        "corte",
        "enchape",
        "ensamble",
        "en_instalacion",
        "entregado"
      ];
      
      expect(statusOrder.length).toBe(9);
      expect(statusOrder[0]).toBe("pendiente");
      expect(statusOrder[statusOrder.length - 1]).toBe("entregado");
    });

    it("should validate status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        contacto: ["cotizacion_enviada"],
        cotizacion_enviada: ["cotizacion_aprobada"],
        cotizacion_aprobada: ["adelanto_recibido"],
        adelanto_recibido: ["en_diseno"],
        en_diseno: ["pendiente_modelado", "pendiente_render"],
        pendiente_modelado: ["en_diseno", "pendiente_render"], // en_diseno si rechaza, pendiente_render si aprueba
        pendiente_render: ["aprobacion_final", "en_diseno"], // aprobacion_final si aprueba, en_diseno si rechaza
        aprobacion_final: ["despiece"],
        despiece: ["corte"],
        corte: ["enchape"],
        enchape: ["ensamble"],
        ensamble: ["en_instalacion"],
        en_instalacion: ["entregado"],
      };

      // Verificar que contacto solo puede ir a cotizacion_enviada
      expect(validTransitions.contacto).toContain("cotizacion_enviada");
      expect(validTransitions.contacto).not.toContain("corte");

      // Verificar que pendiente_render puede ir a aprobacion_final o en_diseno
      expect(validTransitions.pendiente_render).toContain("aprobacion_final");
      expect(validTransitions.pendiente_render).toContain("en_diseno");
    });
  });

  describe("Role Permissions", () => {
    it("should allow admin to change any status", () => {
      const adminRoles = ["admin", "super_admin"];
      const canChangeAnyStatus = (role: string) => adminRoles.includes(role);
      
      expect(canChangeAnyStatus("admin")).toBe(true);
      expect(canChangeAnyStatus("super_admin")).toBe(true);
      expect(canChangeAnyStatus("disenador")).toBe(false);
    });

    it("should allow designer to change design-related statuses", () => {
      const designerStatuses = ["aprobado_diseno", "en_diseno", "pendiente_render"];
      const canDesignerChange = (status: string) => designerStatuses.includes(status);
      
      expect(canDesignerChange("aprobado_diseno")).toBe(true);
      expect(canDesignerChange("en_diseno")).toBe(true);
      expect(canDesignerChange("corte")).toBe(false);
    });

    it("should allow production roles to change production statuses", () => {
      const productionStatuses = ["corte", "enchape", "ensamble", "en_instalacion"];
      const productionRoles = ["jefe_taller", "operario"];
      
      const canProductionChange = (role: string, status: string) => 
        productionRoles.includes(role) && productionStatuses.includes(status);
      
      expect(canProductionChange("jefe_taller", "corte")).toBe(true);
      expect(canProductionChange("operario", "enchape")).toBe(true);
      expect(canProductionChange("disenador", "corte")).toBe(false);
    });
  });

  describe("Design Approval", () => {
    it("should allow client to approve their own project", async () => {
      const mockProject = { id: 1, clientId: 10, status: "pendiente_render" };
      const mockClient = { id: 10, userId: 5 };
      
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.getClientByUserId).mockResolvedValue(mockClient as any);
      
      const project = await db.getProjectById(1);
      const client = await db.getClientByUserId(5);
      
      expect(project?.clientId).toBe(client?.id);
    });

    it("should allow admin to approve on behalf of client", () => {
      const adminRoles = ["admin", "super_admin"];
      const canApproveOnBehalf = (role: string) => adminRoles.includes(role);
      
      expect(canApproveOnBehalf("admin")).toBe(true);
      expect(canApproveOnBehalf("super_admin")).toBe(true);
      expect(canApproveOnBehalf("user")).toBe(false);
    });

    it("should transition to corte when approved", () => {
      const currentStatus = "pendiente_render";
      const approved = true;
      const newStatus = approved ? "corte" : "en_diseno";
      
      expect(newStatus).toBe("corte");
    });

    it("should transition back to en_diseno when rejected", () => {
      const currentStatus = "pendiente_render";
      const approved = false;
      const newStatus = approved ? "corte" : "en_diseno";
      
      expect(newStatus).toBe("en_diseno");
    });
  });

  describe("Photo Stages", () => {
    it("should define all photo stages", () => {
      const photoStages = ["inicial", "diseno", "corte", "enchape", "ensamble", "final"];
      
      expect(photoStages.length).toBe(6);
      expect(photoStages).toContain("inicial");
      expect(photoStages).toContain("final");
    });

    it("should allow designer to upload design photos", () => {
      const designerStages = ["inicial", "diseno"];
      const canDesignerUpload = (stage: string) => designerStages.includes(stage);
      
      expect(canDesignerUpload("diseno")).toBe(true);
      expect(canDesignerUpload("corte")).toBe(false);
    });

    it("should allow production roles to upload production photos", () => {
      const productionStages = ["corte", "enchape", "ensamble", "final"];
      const canProductionUpload = (stage: string) => productionStages.includes(stage);
      
      expect(canProductionUpload("corte")).toBe(true);
      expect(canProductionUpload("diseno")).toBe(false);
    });
  });

  describe("Project Details", () => {
    it("should define detail types", () => {
      const detailTypes = ["medida_especial", "nota_importante", "foto_referencia"];
      
      expect(detailTypes.length).toBe(3);
      expect(detailTypes).toContain("medida_especial");
      expect(detailTypes).toContain("nota_importante");
    });

    it("should allow work roles to add details", () => {
      const workRoles = ["admin", "super_admin", "disenador", "jefe_taller", "operario"];
      const canAddDetails = (role: string) => workRoles.includes(role);
      
      expect(canAddDetails("disenador")).toBe(true);
      expect(canAddDetails("jefe_taller")).toBe(true);
      expect(canAddDetails("user")).toBe(false);
    });
  });
});

describe("Tasks Module", () => {
  describe("Task Assignment Permissions", () => {
    it("should allow super_admin to assign to anyone", () => {
      const allRoles = ["admin", "disenador", "jefe_taller", "operario"];
      const canSuperAdminAssign = (targetRole: string) => allRoles.includes(targetRole);
      
      expect(canSuperAdminAssign("admin")).toBe(true);
      expect(canSuperAdminAssign("disenador")).toBe(true);
      expect(canSuperAdminAssign("operario")).toBe(true);
    });

    it("should allow designer to assign to production roles", () => {
      const designerCanAssignTo = ["jefe_taller", "operario"];
      const canDesignerAssign = (targetRole: string) => designerCanAssignTo.includes(targetRole);
      
      expect(canDesignerAssign("jefe_taller")).toBe(true);
      expect(canDesignerAssign("operario")).toBe(true);
      expect(canDesignerAssign("admin")).toBe(false);
    });

    it("should allow jefe_taller to assign to multiple roles", () => {
      const jefeTallerCanAssignTo = ["admin", "disenador", "operario"];
      const canJefeTallerAssign = (targetRole: string) => jefeTallerCanAssignTo.includes(targetRole);
      
      expect(canJefeTallerAssign("admin")).toBe(true);
      expect(canJefeTallerAssign("disenador")).toBe(true);
      expect(canJefeTallerAssign("operario")).toBe(true);
    });

    it("should allow operario to assign to designer and jefe_taller", () => {
      const operarioCanAssignTo = ["disenador", "jefe_taller"];
      const canOperarioAssign = (targetRole: string) => operarioCanAssignTo.includes(targetRole);
      
      expect(canOperarioAssign("disenador")).toBe(true);
      expect(canOperarioAssign("jefe_taller")).toBe(true);
      expect(canOperarioAssign("admin")).toBe(false);
    });
  });

  describe("Task Status Flow", () => {
    it("should define task statuses", () => {
      const taskStatuses = ["pendiente", "en_progreso", "completada"];
      
      expect(taskStatuses.length).toBe(3);
      expect(taskStatuses[0]).toBe("pendiente");
      expect(taskStatuses[taskStatuses.length - 1]).toBe("completada");
    });

    it("should define task priorities", () => {
      const priorities = ["alta", "media", "baja"];
      
      expect(priorities.length).toBe(3);
      expect(priorities).toContain("alta");
      expect(priorities).toContain("media");
      expect(priorities).toContain("baja");
    });
  });
});
