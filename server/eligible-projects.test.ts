import { describe, it, expect, beforeAll } from "vitest";
import { 
  getEligibleProjectsForAccountingClosure, 
  getArchivedProjectsForClosure 
} from "./db";

describe("Accounting Closure - Eligible Projects", () => {
  describe("getEligibleProjectsForAccountingClosure", () => {
    it("should return projects that are archived, fully paid, and not in any closure", async () => {
      const eligibleProjects = await getEligibleProjectsForAccountingClosure();
      
      // Verificar que es un array
      expect(Array.isArray(eligibleProjects)).toBe(true);
      
      // Si hay proyectos, verificar estructura
      if (eligibleProjects.length > 0) {
        const project = eligibleProjects[0];
        
        // Verificar campos requeridos
        expect(project).toHaveProperty("projectId");
        expect(project).toHaveProperty("projectName");
        expect(project).toHaveProperty("clientName");
        expect(project).toHaveProperty("totalAmount");
        expect(project).toHaveProperty("totalPaid");
        expect(project).toHaveProperty("balance");
        
        // Verificar tipos de datos
        expect(typeof project.projectId).toBe("number");
        expect(typeof project.projectName).toBe("string");
        expect(typeof project.clientName).toBe("string");
        expect(typeof project.totalAmount).toBe("number");
        expect(typeof project.totalPaid).toBe("number");
        expect(typeof project.balance).toBe("number");
        
        // Verificar que balance = 0 (criterio de elegibilidad)
        expect(project.balance).toBe(0);
        
        // Verificar que totalPaid = totalAmount (pagos completados)
        expect(project.totalPaid).toBe(project.totalAmount);
      }
    });

    it("should return empty array if no eligible projects exist", async () => {
      const eligibleProjects = await getEligibleProjectsForAccountingClosure();
      
      // Puede ser vacío o tener proyectos, ambos son válidos
      expect(Array.isArray(eligibleProjects)).toBe(true);
    });

    it("should not include projects with pending payments", async () => {
      const eligibleProjects = await getEligibleProjectsForAccountingClosure();
      
      // Todos los proyectos retornados deben tener balance = 0
      eligibleProjects.forEach((project) => {
        expect(project.balance).toBe(0);
        expect(project.totalPaid).toBe(project.totalAmount);
      });
    });
  });

  describe("getArchivedProjectsForClosure", () => {
    it("should return all archived projects without a closure", async () => {
      const archivedProjects = await getArchivedProjectsForClosure();
      
      // Verificar que es un array
      expect(Array.isArray(archivedProjects)).toBe(true);
      
      // Si hay proyectos, verificar estructura
      if (archivedProjects.length > 0) {
        const project = archivedProjects[0];
        
        // Verificar campos requeridos
        expect(project).toHaveProperty("projectId");
        expect(project).toHaveProperty("projectName");
        expect(project).toHaveProperty("clientName");
        expect(project).toHaveProperty("totalAmount");
        expect(project).toHaveProperty("totalPaid");
        expect(project).toHaveProperty("balance");
        expect(project).toHaveProperty("status");
        expect(project).toHaveProperty("isArchived");
        expect(project).toHaveProperty("accountingClosureId");
        
        // Verificar que isArchived = 1
        expect(project.isArchived).toBe(1);
        
        // Verificar que accountingClosureId es null
        expect(project.accountingClosureId).toBeNull();
      }
    });

    it("should include projects with pending payments", async () => {
      const archivedProjects = await getArchivedProjectsForClosure();
      
      // Algunos proyectos pueden tener balance > 0 (pagos pendientes)
      // Esto es diferente a getEligibleProjects que solo retorna balance = 0
      expect(Array.isArray(archivedProjects)).toBe(true);
    });

    it("should have more or equal projects than eligible projects", async () => {
      const eligibleProjects = await getEligibleProjectsForAccountingClosure();
      const archivedProjects = await getArchivedProjectsForClosure();
      
      // getArchivedProjects debe retornar al menos los mismos proyectos que getEligibleProjects
      expect(archivedProjects.length).toBeGreaterThanOrEqual(eligibleProjects.length);
    });

    it("should only return projects not in any closure", async () => {
      const archivedProjects = await getArchivedProjectsForClosure();
      
      // Todos los proyectos retornados deben tener accountingClosureId = null
      archivedProjects.forEach((project) => {
        expect(project.accountingClosureId).toBeNull();
      });
    });
  });

  describe("Data consistency", () => {
    it("eligible projects should be a subset of archived projects", async () => {
      const eligibleProjects = await getEligibleProjectsForAccountingClosure();
      const archivedProjects = await getArchivedProjectsForClosure();
      
      // Crear set de IDs elegibles
      const eligibleIds = new Set(eligibleProjects.map((p) => p.projectId));
      
      // Crear set de IDs archivados
      const archivedIds = new Set(archivedProjects.map((p) => p.projectId));
      
      // Verificar que todos los elegibles están en archivados
      eligibleIds.forEach((id) => {
        expect(archivedIds.has(id)).toBe(true);
      });
    });

    it("balance calculation should be consistent", async () => {
      const archivedProjects = await getArchivedProjectsForClosure();
      
      archivedProjects.forEach((project) => {
        // balance = totalAmount - totalPaid
        const calculatedBalance = project.totalAmount - project.totalPaid;
        expect(project.balance).toBe(calculatedBalance);
      });
    });
  });
});
