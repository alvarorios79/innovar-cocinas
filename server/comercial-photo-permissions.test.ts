import { describe, it, expect } from "vitest";

// Función de validación de permisos de fotos (copia de la lógica en routers.ts)
function validatePhotoUploadPermission(role: string, stage: string, category?: string): boolean {
  if (role === "super_admin" || role === "admin") return true;

  if (role === "comercial") {
    // Comercial puede subir fotos de cotización y medidas en cualquier etapa
    if (category && ["cotizacion", "medidas"].includes(category)) {
      return true; // Permitir en cualquier etapa
    }
    return false;
  }

  if (role === "disenador") {
    return ["inicial", "diseno"].includes(stage);
  }

  if (role === "jefe_taller" || role === "operario") {
    return ["corte", "enchape", "ensamble", "final"].includes(stage);
  }

  return false;
}

describe("Comercial Photo Upload Permissions", () => {
  describe("Rol comercial", () => {
    it("puede subir fotos de cotización en cualquier etapa", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "diseno", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "corte", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "final", "cotizacion")).toBe(true);
    });

    it("puede subir fotos de medidas en cualquier etapa", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "diseno", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "corte", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "final", "medidas")).toBe(true);
    });

    it("NO puede subir fotos de diseños", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial", "disenos")).toBe(false);
      expect(validatePhotoUploadPermission("comercial", "diseno", "disenos")).toBe(false);
    });

    it("NO puede subir fotos de avance", () => {
      expect(validatePhotoUploadPermission("comercial", "corte", "avance")).toBe(false);
      expect(validatePhotoUploadPermission("comercial", "enchape", "avance")).toBe(false);
    });

    it("NO puede subir fotos de instalación", () => {
      expect(validatePhotoUploadPermission("comercial", "ensamble", "instalacion")).toBe(false);
    });

    it("NO puede subir fotos de entrega", () => {
      expect(validatePhotoUploadPermission("comercial", "final", "entrega")).toBe(false);
    });

    it("NO puede subir fotos sin categoría especificada", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial")).toBe(false);
    });
  });

  describe("Rol admin", () => {
    it("puede subir cualquier tipo de foto", () => {
      expect(validatePhotoUploadPermission("admin", "inicial", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("admin", "diseno", "disenos")).toBe(true);
      expect(validatePhotoUploadPermission("admin", "corte", "avance")).toBe(true);
      expect(validatePhotoUploadPermission("admin", "final", "entrega")).toBe(true);
    });
  });

  describe("Rol super_admin", () => {
    it("puede subir cualquier tipo de foto", () => {
      expect(validatePhotoUploadPermission("super_admin", "inicial", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("super_admin", "diseno", "disenos")).toBe(true);
      expect(validatePhotoUploadPermission("super_admin", "corte", "avance")).toBe(true);
      expect(validatePhotoUploadPermission("super_admin", "final", "entrega")).toBe(true);
    });
  });

  describe("Rol diseñador", () => {
    it("puede subir fotos en etapa inicial y diseño", () => {
      expect(validatePhotoUploadPermission("disenador", "inicial")).toBe(true);
      expect(validatePhotoUploadPermission("disenador", "diseno")).toBe(true);
    });

    it("NO puede subir fotos en etapas de producción", () => {
      expect(validatePhotoUploadPermission("disenador", "corte")).toBe(false);
      expect(validatePhotoUploadPermission("disenador", "enchape")).toBe(false);
    });
  });

  describe("Rol jefe_taller", () => {
    it("puede subir fotos en etapas de producción", () => {
      expect(validatePhotoUploadPermission("jefe_taller", "corte")).toBe(true);
      expect(validatePhotoUploadPermission("jefe_taller", "enchape")).toBe(true);
      expect(validatePhotoUploadPermission("jefe_taller", "ensamble")).toBe(true);
      expect(validatePhotoUploadPermission("jefe_taller", "final")).toBe(true);
    });

    it("NO puede subir fotos en etapa inicial o diseño", () => {
      expect(validatePhotoUploadPermission("jefe_taller", "inicial")).toBe(false);
      expect(validatePhotoUploadPermission("jefe_taller", "diseno")).toBe(false);
    });
  });
});
