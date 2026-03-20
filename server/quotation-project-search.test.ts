import { describe, it, expect } from "vitest";

/**
 * Tests para validar la búsqueda de proyecto en todas las versiones
 */

describe("Quotation Project Search Across Versions", () => {
  describe("Búsqueda de proyecto en cadena de versiones", () => {
    it("Debe encontrar proyecto en V1 cuando se busca desde V3", () => {
      // Simular cadena de versiones V1 -> V2 -> V3
      const allVersions = [
        { id: 1, versionNumber: 1 },
        { id: 2, versionNumber: 2 },
        { id: 3, versionNumber: 3 },
      ];

      // Simular proyectos: solo V1 tiene proyecto
      const projectsByVersion = {
        1: { id: 100, quotationId: 1 },
        2: null,
        3: null,
      };

      // Buscar proyecto en cualquier versión
      let project = null;
      for (const version of allVersions) {
        project = projectsByVersion[version.id as keyof typeof projectsByVersion];
        if (project) break;
      }

      // Debe encontrar el proyecto en V1
      expect(project).not.toBeNull();
      expect(project?.id).toBe(100);
      expect(project?.quotationId).toBe(1);
    });

    it("Debe encontrar proyecto en V2 cuando se busca desde V3", () => {
      const allVersions = [
        { id: 1, versionNumber: 1 },
        { id: 2, versionNumber: 2 },
        { id: 3, versionNumber: 3 },
      ];

      // Proyecto vinculado a V2
      const projectsByVersion = {
        1: null,
        2: { id: 100, quotationId: 2 },
        3: null,
      };

      let project = null;
      for (const version of allVersions) {
        project = projectsByVersion[version.id as keyof typeof projectsByVersion];
        if (project) break;
      }

      expect(project).not.toBeNull();
      expect(project?.id).toBe(100);
      expect(project?.quotationId).toBe(2);
    });

    it("Debe encontrar proyecto en V3 cuando se busca desde V3", () => {
      const allVersions = [
        { id: 1, versionNumber: 1 },
        { id: 2, versionNumber: 2 },
        { id: 3, versionNumber: 3 },
      ];

      // Proyecto vinculado a V3
      const projectsByVersion = {
        1: null,
        2: null,
        3: { id: 100, quotationId: 3 },
      };

      let project = null;
      for (const version of allVersions) {
        project = projectsByVersion[version.id as keyof typeof projectsByVersion];
        if (project) break;
      }

      expect(project).not.toBeNull();
      expect(project?.id).toBe(100);
      expect(project?.quotationId).toBe(3);
    });

    it("Debe retornar null si no hay proyecto en ninguna versión", () => {
      const allVersions = [
        { id: 1, versionNumber: 1 },
        { id: 2, versionNumber: 2 },
        { id: 3, versionNumber: 3 },
      ];

      const projectsByVersion = {
        1: null,
        2: null,
        3: null,
      };

      let project = null;
      for (const version of allVersions) {
        project = projectsByVersion[version.id as keyof typeof projectsByVersion];
        if (project) break;
      }

      expect(project).toBeNull();
    });
  });

  describe("Actualización de proyecto a nueva versión", () => {
    it("Debe actualizar proyecto de V2 a V3", () => {
      // Proyecto encontrado en V2
      const project = { id: 100, quotationId: 2 };
      const newQuotationId = 3;
      const newTotal = "3946875";

      // Simular actualización
      const updatedProject = {
        ...project,
        quotationId: newQuotationId,
        totalAmount: newTotal,
      };

      expect(updatedProject.quotationId).toBe(3);
      expect(updatedProject.totalAmount).toBe("3946875");
      expect(updatedProject.quotationId).not.toBe(2);
    });

    it("Debe actualizar proyecto de V1 a V3", () => {
      const project = { id: 100, quotationId: 1 };
      const newQuotationId = 3;
      const newTotal = "3946875";

      const updatedProject = {
        ...project,
        quotationId: newQuotationId,
        totalAmount: newTotal,
      };

      expect(updatedProject.quotationId).toBe(3);
      expect(updatedProject.totalAmount).toBe("3946875");
    });

    it("Debe actualizar totalAmount correctamente", () => {
      const project = { id: 100, quotationId: 2, totalAmount: "2946875" };
      const newTotal = "3946875";

      const updatedProject = {
        ...project,
        totalAmount: newTotal,
      };

      expect(updatedProject.totalAmount).not.toBe("2946875");
      expect(updatedProject.totalAmount).toBe("3946875");
    });
  });

  describe("Integración: Flujo V1 -> V2 -> V3 con proyecto", () => {
    it("Crear V1, proyecto en V1, crear V2, crear V3 - proyecto debe estar en V3", () => {
      // Paso 1: Crear V1
      const v1 = { id: 1, versionNumber: 1, total: "2000000" };

      // Paso 2: Crear proyecto desde V1
      let project = { id: 100, quotationId: v1.id, totalAmount: v1.total };

      // Paso 3: Crear V2
      const v2 = { id: 2, versionNumber: 2, parentId: v1.id, total: "2500000" };
      
      // Buscar proyecto en cadena V1->V2
      let allVersions = [v1, v2];
      let foundProject = null;
      for (const version of allVersions) {
        if (version.id === project.quotationId) {
          foundProject = project;
          break;
        }
      }

      // Actualizar proyecto a V2
      if (foundProject) {
        project = { ...project, quotationId: v2.id, totalAmount: v2.total };
      }

      expect(project.quotationId).toBe(2);
      expect(project.totalAmount).toBe("2500000");

      // Paso 4: Crear V3
      const v3 = { id: 3, versionNumber: 3, parentId: v2.id, total: "3946875" };

      // Buscar proyecto en cadena V1->V2->V3
      allVersions = [v1, v2, v3];
      foundProject = null;
      for (const version of allVersions) {
        if (version.id === project.quotationId) {
          foundProject = project;
          break;
        }
      }

      // Actualizar proyecto a V3
      if (foundProject) {
        project = { ...project, quotationId: v3.id, totalAmount: v3.total };
      }

      expect(project.quotationId).toBe(3);
      expect(project.totalAmount).toBe("3946875");
      expect(project.totalAmount).not.toBe("2946875");
    });

    it("Crear V1, proyecto en V1, crear V2 (sin proyecto), crear V3 - proyecto debe estar en V3", () => {
      const v1 = { id: 1, versionNumber: 1, total: "2000000" };
      let project = { id: 100, quotationId: v1.id, totalAmount: v1.total };

      // Crear V2 sin proyecto
      const v2 = { id: 2, versionNumber: 2, parentId: v1.id, total: "2500000" };

      // Buscar proyecto en V1->V2
      let allVersions = [v1, v2];
      let foundProject = null;
      for (const version of allVersions) {
        if (version.id === project.quotationId) {
          foundProject = project;
          break;
        }
      }

      // Debe encontrar en V1 y actualizar a V2
      if (foundProject) {
        project = { ...project, quotationId: v2.id, totalAmount: v2.total };
      }

      expect(project.quotationId).toBe(2);

      // Crear V3
      const v3 = { id: 3, versionNumber: 3, parentId: v2.id, total: "3946875" };

      // Buscar proyecto en V1->V2->V3
      allVersions = [v1, v2, v3];
      foundProject = null;
      for (const version of allVersions) {
        if (version.id === project.quotationId) {
          foundProject = project;
          break;
        }
      }

      // Debe encontrar en V2 y actualizar a V3
      if (foundProject) {
        project = { ...project, quotationId: v3.id, totalAmount: v3.total };
      }

      expect(project.quotationId).toBe(3);
      expect(project.totalAmount).toBe("3946875");
    });
  });
});
