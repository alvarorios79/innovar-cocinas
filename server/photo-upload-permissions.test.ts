import { describe, it, expect } from "vitest";

// Función de validación de permisos de subida de fotos (copiada de routers.ts para testing)
function validatePhotoUploadPermission(role: string, stage: string, category?: string): boolean {
  if (role === "super_admin" || role === "admin") {
    return true;
  }

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

describe("Photo Upload Permissions", () => {
  describe("Rol comercial", () => {
    it("debe permitir subir fotos de categoría 'cotizacion' en cualquier etapa", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "diseno", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "corte", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "enchape", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "ensamble", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "final", "cotizacion")).toBe(true);
    });

    it("debe permitir subir fotos de categoría 'medidas' en cualquier etapa", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "diseno", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "corte", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "enchape", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "ensamble", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("comercial", "final", "medidas")).toBe(true);
    });

    it("debe denegar subir fotos de otras categorías", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial", "disenos")).toBe(false);
      expect(validatePhotoUploadPermission("comercial", "inicial", "avance")).toBe(false);
      expect(validatePhotoUploadPermission("comercial", "inicial", "instalacion")).toBe(false);
      expect(validatePhotoUploadPermission("comercial", "inicial", "entrega")).toBe(false);
    });

    it("debe denegar subir fotos sin categoría", () => {
      expect(validatePhotoUploadPermission("comercial", "inicial")).toBe(false);
      expect(validatePhotoUploadPermission("comercial", "inicial", undefined)).toBe(false);
    });
  });

  describe("Rol admin y super_admin", () => {
    it("debe permitir subir fotos en cualquier categoría y etapa", () => {
      expect(validatePhotoUploadPermission("admin", "inicial", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("admin", "diseno", "disenos")).toBe(true);
      expect(validatePhotoUploadPermission("admin", "corte", "avance")).toBe(true);
      expect(validatePhotoUploadPermission("super_admin", "inicial", "cotizacion")).toBe(true);
      expect(validatePhotoUploadPermission("super_admin", "final", "entrega")).toBe(true);
    });
  });

  describe("Rol diseñador", () => {
    it("debe permitir subir fotos solo en etapas inicial y diseno", () => {
      expect(validatePhotoUploadPermission("disenador", "inicial", "medidas")).toBe(true);
      expect(validatePhotoUploadPermission("disenador", "diseno", "disenos")).toBe(true);
    });

    it("debe denegar subir fotos en otras etapas", () => {
      expect(validatePhotoUploadPermission("disenador", "corte", "avance")).toBe(false);
      expect(validatePhotoUploadPermission("disenador", "enchape", "avance")).toBe(false);
      expect(validatePhotoUploadPermission("disenador", "ensamble", "avance")).toBe(false);
      expect(validatePhotoUploadPermission("disenador", "final", "entrega")).toBe(false);
    });
  });

  describe("Rol jefe_taller y operario", () => {
    it("debe permitir subir fotos en etapas de producción", () => {
      expect(validatePhotoUploadPermission("jefe_taller", "corte", "avance")).toBe(true);
      expect(validatePhotoUploadPermission("jefe_taller", "enchape", "avance")).toBe(true);
      expect(validatePhotoUploadPermission("jefe_taller", "ensamble", "avance")).toBe(true);
      expect(validatePhotoUploadPermission("jefe_taller", "final", "entrega")).toBe(true);
      expect(validatePhotoUploadPermission("operario", "corte", "avance")).toBe(true);
      expect(validatePhotoUploadPermission("operario", "enchape", "avance")).toBe(true);
    });

    it("debe denegar subir fotos en etapas iniciales", () => {
      expect(validatePhotoUploadPermission("jefe_taller", "inicial", "medidas")).toBe(false);
      expect(validatePhotoUploadPermission("jefe_taller", "diseno", "disenos")).toBe(false);
      expect(validatePhotoUploadPermission("operario", "inicial", "medidas")).toBe(false);
      expect(validatePhotoUploadPermission("operario", "diseno", "disenos")).toBe(false);
    });
  });

  describe("Rol user (cliente)", () => {
    it("debe denegar subir fotos en cualquier categoría y etapa", () => {
      expect(validatePhotoUploadPermission("user", "inicial", "cotizacion")).toBe(false);
      expect(validatePhotoUploadPermission("user", "diseno", "disenos")).toBe(false);
      expect(validatePhotoUploadPermission("user", "corte", "avance")).toBe(false);
    });
  });
});
