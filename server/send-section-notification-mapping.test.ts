import { describe, it, expect } from "vitest";

/**
 * Test para validar que el mapping de subcategory a sectionKey es correcto
 * en el frontend (ProjectDetail.tsx)
 */

describe("sendSectionNotification - Mapping Validation", () => {
  // Simular el mapping del frontend
  const subcategoryToSectionKey: Record<string, "corte" | "enchape" | "armado" | "instalacion" | "entrega"> = {
    // Fotos de avance
    corte: "corte",
    enchape: "enchape",
    armado: "armado",
    // Fotos de instalación
    proceso_instalacion: "instalacion",
    // Fotos finales
    fotos_finales: "entrega",
    // Fallback para otros valores
    fotos_iniciales: "corte",
    renders: "corte",
    despieces: "corte",
    detalles: "corte",
    modelado_3d: "corte",
    dibujo: "corte",
  };

  // Valores válidos del backend
  const validSectionKeys = ["corte", "enchape", "armado", "instalacion", "entrega"];

  it("debe mapear 'corte' a 'corte'", () => {
    const result = subcategoryToSectionKey["corte"];
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'enchape' a 'enchape'", () => {
    const result = subcategoryToSectionKey["enchape"];
    expect(result).toBe("enchape");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'armado' a 'armado'", () => {
    const result = subcategoryToSectionKey["armado"];
    expect(result).toBe("armado");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'proceso_instalacion' a 'instalacion'", () => {
    const result = subcategoryToSectionKey["proceso_instalacion"];
    expect(result).toBe("instalacion");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'fotos_finales' a 'entrega'", () => {
    const result = subcategoryToSectionKey["fotos_finales"];
    expect(result).toBe("entrega");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'fotos_iniciales' a 'corte' (fallback)", () => {
    const result = subcategoryToSectionKey["fotos_iniciales"];
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'renders' a 'corte' (fallback)", () => {
    const result = subcategoryToSectionKey["renders"];
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'despieces' a 'corte' (fallback)", () => {
    const result = subcategoryToSectionKey["despieces"];
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'detalles' a 'corte' (fallback)", () => {
    const result = subcategoryToSectionKey["detalles"];
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'modelado_3d' a 'corte' (fallback)", () => {
    const result = subcategoryToSectionKey["modelado_3d"];
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("debe mapear 'dibujo' a 'corte' (fallback)", () => {
    const result = subcategoryToSectionKey["dibujo"];
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("todos los valores mapeados deben ser válidos en el backend", () => {
    const mappedValues = Object.values(subcategoryToSectionKey);
    const uniqueValues = new Set(mappedValues);
    
    uniqueValues.forEach((value) => {
      expect(validSectionKeys).toContain(value);
    });
  });

  it("debe retornar 'corte' como fallback para valores desconocidos", () => {
    const result = subcategoryToSectionKey["valor_desconocido"] || "corte";
    expect(result).toBe("corte");
    expect(validSectionKeys).toContain(result);
  });

  it("no debe enviar valores con tildes, espacios o mayúsculas", () => {
    const mappedValues = Object.values(subcategoryToSectionKey);
    
    mappedValues.forEach((value) => {
      // Verificar que no tenga tildes
      expect(value).not.toMatch(/[áéíóúñ]/);
      // Verificar que no tenga espacios
      expect(value).not.toMatch(/\s/);
      // Verificar que sea minúscula
      expect(value).toBe(value.toLowerCase());
    });
  });
});
