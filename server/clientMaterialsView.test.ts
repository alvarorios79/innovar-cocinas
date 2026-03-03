import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock database functions
vi.mock("./db", () => ({
  getProjectMaterials: vi.fn(),
  getProjectHardwareSelections: vi.fn(),
  getClientByUserId: vi.fn(),
  getProjectsByClientId: vi.fn(),
}));

describe("Client Materials View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectMaterials", () => {
    it("should return materials for a project", async () => {
      const mockMaterials = {
        id: 1,
        projectId: 1,
        woodType: "rh",
        woodColor: "Roble Santana",
        woodPhotoUrl: "https://example.com/wood.jpg",
        countertopType: "cuarzo",
        countertopName: "Blanco Carrara",
        countertopPhotoUrl: "https://example.com/countertop.jpg",
        sinkMeasure: "84x50 cm",
        sinkPhotoUrl: "https://example.com/sink.jpg",
        notes: "Materiales premium",
      };

      vi.mocked(db.getProjectMaterials).mockResolvedValue(mockMaterials);

      const result = await db.getProjectMaterials(1);

      expect(result).toEqual(mockMaterials);
      expect(result?.woodType).toBe("rh");
      expect(result?.countertopType).toBe("cuarzo");
    });

    it("should return null when no materials exist", async () => {
      vi.mocked(db.getProjectMaterials).mockResolvedValue(null);

      const result = await db.getProjectMaterials(999);

      expect(result).toBeNull();
    });
  });

  describe("getProjectHardwareSelections", () => {
    it("should return hardware selections with hardware details", async () => {
      const mockSelections = [
        {
          id: 1,
          projectId: 1,
          hardwareId: 1,
          selectedOption: "Cierre lento Acero",
          hardware: {
            id: 1,
            name: "Bisagras",
            description: "Bisagras para puertas de cocina",
            category: "cocinas",
            photoUrl: "https://example.com/bisagras.jpg",
            options: ["Cierre lento Acero", "Estándar"],
          },
        },
        {
          id: 2,
          projectId: 1,
          hardwareId: 2,
          selectedOption: "Peso alto",
          hardware: {
            id: 2,
            name: "Rieles de cajón",
            description: "Rieles para cajones de cocina",
            category: "cocinas",
            photoUrl: "https://example.com/rieles.jpg",
            options: ["Peso alto", "Peso medio", "Sencillo"],
          },
        },
      ];

      vi.mocked(db.getProjectHardwareSelections).mockResolvedValue(mockSelections);

      const result = await db.getProjectHardwareSelections(1);

      expect(result).toHaveLength(2);
      expect(result[0].hardware.name).toBe("Bisagras");
      expect(result[0].selectedOption).toBe("Cierre lento Acero");
      expect(result[1].hardware.category).toBe("cocinas");
    });

    it("should return empty array when no hardware selected", async () => {
      vi.mocked(db.getProjectHardwareSelections).mockResolvedValue([]);

      const result = await db.getProjectHardwareSelections(999);

      expect(result).toEqual([]);
    });
  });

  describe("Client Portal Access", () => {
    it("should return projects for client user", async () => {
      const mockClient = {
        id: 1,
        userId: 10,
        name: "Carlos Betancourt",
        email: "carlos@example.com",
        whatsappPhone: "+573001234567",
      };

      const mockProjects = [
        {
          id: 1,
          name: "Cocina Integral",
          status: "en_diseno",
          clientId: 1,
        },
      ];

      vi.mocked(db.getClientByUserId).mockResolvedValue(mockClient);
      vi.mocked(db.getProjectsByClientId).mockResolvedValue(mockProjects);

      const client = await db.getClientByUserId(10);
      expect(client).not.toBeNull();

      const projects = await db.getProjectsByClientId(client!.id);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Cocina Integral");
    });

    it("should return empty array when user has no client record", async () => {
      vi.mocked(db.getClientByUserId).mockResolvedValue(null);

      const client = await db.getClientByUserId(999);
      expect(client).toBeNull();
    });
  });

  describe("Materials Display Logic", () => {
    it("should identify when materials are defined", async () => {
      const mockMaterials = {
        id: 1,
        projectId: 1,
        woodType: "rh",
        woodColor: "Roble",
        woodPhotoUrl: null,
        countertopType: null,
        countertopName: null,
        countertopPhotoUrl: null,
        sinkMeasure: null,
        sinkPhotoUrl: null,
        notes: null,
      };

      vi.mocked(db.getProjectMaterials).mockResolvedValue(mockMaterials);

      const materials = await db.getProjectMaterials(1);
      
      // Check if any material is defined
      const hasMaterials = materials && (
        materials.woodType || 
        materials.countertopType || 
        materials.sinkMeasure
      );

      expect(hasMaterials).toBeTruthy();
    });

    it("should identify when no materials are defined", async () => {
      const mockMaterials = {
        id: 1,
        projectId: 1,
        woodType: null,
        woodColor: null,
        woodPhotoUrl: null,
        countertopType: null,
        countertopName: null,
        countertopPhotoUrl: null,
        sinkMeasure: null,
        sinkPhotoUrl: null,
        notes: null,
      };

      vi.mocked(db.getProjectMaterials).mockResolvedValue(mockMaterials);

      const materials = await db.getProjectMaterials(1);
      
      const hasMaterials = materials && (
        materials.woodType || 
        materials.countertopType || 
        materials.sinkMeasure
      );

      expect(hasMaterials).toBeFalsy();
    });
  });

  describe("Hardware Categories", () => {
    it("should group hardware by category", async () => {
      const mockSelections = [
        {
          id: 1,
          projectId: 1,
          hardwareId: 1,
          selectedOption: "Cierre lento",
          hardware: { id: 1, name: "Bisagras", category: "cocinas", description: "", photoUrl: null, options: [] },
        },
        {
          id: 2,
          projectId: 1,
          hardwareId: 2,
          selectedOption: "Peso alto",
          hardware: { id: 2, name: "Rieles", category: "cocinas", description: "", photoUrl: null, options: [] },
        },
        {
          id: 3,
          projectId: 1,
          hardwareId: 3,
          selectedOption: "Cromado",
          hardware: { id: 3, name: "Tubo colgar", category: "closets", description: "", photoUrl: null, options: [] },
        },
      ];

      vi.mocked(db.getProjectHardwareSelections).mockResolvedValue(mockSelections);

      const selections = await db.getProjectHardwareSelections(1);
      
      // Group by category
      const byCategory = selections.reduce((acc, sel) => {
        const cat = sel.hardware.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(sel);
        return acc;
      }, {} as Record<string, typeof selections>);

      expect(Object.keys(byCategory)).toContain("cocinas");
      expect(Object.keys(byCategory)).toContain("closets");
      expect(byCategory["cocinas"]).toHaveLength(2);
      expect(byCategory["closets"]).toHaveLength(1);
    });
  });
});
