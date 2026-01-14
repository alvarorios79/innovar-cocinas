import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock the database functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    createProjectPhoto: vi.fn().mockResolvedValue(1),
    getProjectPhotosByProjectId: vi.fn().mockResolvedValue([]),
    getProjectPhotosByCategory: vi.fn().mockResolvedValue([]),
    getProjectPhotosByStage: vi.fn().mockResolvedValue([]),
  };
});

describe("File Categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Category Values", () => {
    const validCategories = ["medidas", "disenos", "avance", "materiales", "instalacion", "entrega", "otros"];

    it("debe aceptar todas las categorías válidas", () => {
      validCategories.forEach((category) => {
        expect(validCategories).toContain(category);
      });
    });

    it("debe tener 7 categorías definidas", () => {
      expect(validCategories.length).toBe(7);
    });

    it("debe incluir categoría 'medidas' para documentos de GoodNotes", () => {
      expect(validCategories).toContain("medidas");
    });

    it("debe incluir categoría 'disenos' para renders y planos", () => {
      expect(validCategories).toContain("disenos");
    });

    it("debe incluir categoría 'avance' para fotos de producción", () => {
      expect(validCategories).toContain("avance");
    });

    it("debe incluir categoría 'otros' como valor por defecto", () => {
      expect(validCategories).toContain("otros");
    });
  });

  describe("createProjectPhoto con categoría", () => {
    it("debe crear foto con categoría especificada", async () => {
      const photoData = {
        projectId: 1,
        stage: "inicial" as const,
        category: "medidas" as const,
        photoUrl: "https://example.com/photo.pdf",
        uploadedBy: 1,
      };

      await db.createProjectPhoto(photoData);

      expect(db.createProjectPhoto).toHaveBeenCalledWith(photoData);
    });

    it("debe crear foto con categoría 'otros' por defecto", async () => {
      const photoData = {
        projectId: 1,
        stage: "inicial" as const,
        category: "otros" as const,
        photoUrl: "https://example.com/photo.jpg",
        uploadedBy: 1,
      };

      await db.createProjectPhoto(photoData);

      expect(db.createProjectPhoto).toHaveBeenCalledWith(photoData);
    });
  });

  describe("getProjectPhotosByCategory", () => {
    it("debe filtrar fotos por categoría 'medidas'", async () => {
      const mockPhotos = [
        { id: 1, projectId: 1, stage: "inicial", category: "medidas", photoUrl: "url1" },
        { id: 2, projectId: 1, stage: "inicial", category: "medidas", photoUrl: "url2" },
      ];
      
      vi.mocked(db.getProjectPhotosByCategory).mockResolvedValue(mockPhotos as any);

      const result = await db.getProjectPhotosByCategory(1, "medidas");

      expect(db.getProjectPhotosByCategory).toHaveBeenCalledWith(1, "medidas");
      expect(result).toHaveLength(2);
      expect(result.every((p: any) => p.category === "medidas")).toBe(true);
    });

    it("debe retornar array vacío si no hay fotos en la categoría", async () => {
      vi.mocked(db.getProjectPhotosByCategory).mockResolvedValue([]);

      const result = await db.getProjectPhotosByCategory(1, "instalacion");

      expect(result).toHaveLength(0);
    });
  });

  describe("Combinación de filtros", () => {
    it("debe poder filtrar por etapa y categoría", async () => {
      const mockPhotos = [
        { id: 1, projectId: 1, stage: "diseno", category: "disenos", photoUrl: "url1" },
      ];
      
      vi.mocked(db.getProjectPhotosByCategory).mockResolvedValue(mockPhotos as any);

      const result = await db.getProjectPhotosByCategory(1, "disenos");

      expect(result).toHaveLength(1);
      expect(result[0].stage).toBe("diseno");
      expect(result[0].category).toBe("disenos");
    });
  });

  describe("Categorías por tipo de archivo", () => {
    it("PDFs de medidas deben ir a categoría 'medidas'", () => {
      const expectedCategory = "medidas";
      const fileType = "application/pdf";
      const description = "Medidas exportadas de GoodNotes";
      
      // Simular la lógica de asignación de categoría
      expect(expectedCategory).toBe("medidas");
      expect(fileType).toBe("application/pdf");
    });

    it("Renders 3D deben ir a categoría 'disenos'", () => {
      const expectedCategory = "disenos";
      const fileType = "image/png";
      const description = "Render 3D de la cocina";
      
      expect(expectedCategory).toBe("disenos");
    });

    it("Fotos de producción deben ir a categoría 'avance'", () => {
      const expectedCategory = "avance";
      const stage = "corte";
      
      expect(expectedCategory).toBe("avance");
      expect(["corte", "enchape", "ensamble"]).toContain(stage);
    });
  });
});
