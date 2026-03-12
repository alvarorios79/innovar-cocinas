import { describe, it, expect } from "vitest";
import { validatePhotoViewPermission, validatePhotoDeletePermission } from "./routers/helpers";

describe("Photo View & Delete Permissions", () => {
  describe("validatePhotoViewPermission", () => {
    it("debe permitir a jefe_taller ver fotos de 'disenos'", () => {
      const result = validatePhotoViewPermission("jefe_taller", "disenos");
      expect(result).toBe(true);
    });

    it("debe permitir a operario ver fotos de 'disenos'", () => {
      const result = validatePhotoViewPermission("operario", "disenos");
      expect(result).toBe(true);
    });

    it("debe permitir a jefe_taller ver fotos de 'avance'", () => {
      const result = validatePhotoViewPermission("jefe_taller", "avance");
      expect(result).toBe(true);
    });

    it("debe permitir a operario ver fotos de 'avance'", () => {
      const result = validatePhotoViewPermission("operario", "avance");
      expect(result).toBe(true);
    });

    it("debe permitir a jefe_taller ver fotos de 'instalacion'", () => {
      const result = validatePhotoViewPermission("jefe_taller", "instalacion");
      expect(result).toBe(true);
    });

    it("debe permitir a operario ver fotos de 'instalacion'", () => {
      const result = validatePhotoViewPermission("operario", "instalacion");
      expect(result).toBe(true);
    });

    it("debe permitir a jefe_taller ver fotos de 'entrega'", () => {
      const result = validatePhotoViewPermission("jefe_taller", "entrega");
      expect(result).toBe(true);
    });

    it("debe permitir a operario ver fotos de 'entrega'", () => {
      const result = validatePhotoViewPermission("operario", "entrega");
      expect(result).toBe(true);
    });

    it("debe rechazar a jefe_taller ver fotos de 'cotizacion'", () => {
      const result = validatePhotoViewPermission("jefe_taller", "cotizacion");
      expect(result).toBe(false);
    });

    it("debe rechazar a operario ver fotos de 'cotizacion'", () => {
      const result = validatePhotoViewPermission("operario", "cotizacion");
      expect(result).toBe(false);
    });

    it("debe permitir a disenador ver todas las categorías", () => {
      expect(validatePhotoViewPermission("disenador", "disenos")).toBe(true);
      expect(validatePhotoViewPermission("disenador", "avance")).toBe(true);
      expect(validatePhotoViewPermission("disenador", "cotizacion")).toBe(true);
    });

    it("debe permitir a comercial ver todas las categorías", () => {
      expect(validatePhotoViewPermission("comercial", "disenos")).toBe(true);
      expect(validatePhotoViewPermission("comercial", "avance")).toBe(true);
      expect(validatePhotoViewPermission("comercial", "cotizacion")).toBe(true);
    });

    it("debe permitir a admin ver todas las categorías", () => {
      expect(validatePhotoViewPermission("admin", "disenos")).toBe(true);
      expect(validatePhotoViewPermission("admin", "avance")).toBe(true);
      expect(validatePhotoViewPermission("admin", "cotizacion")).toBe(true);
    });

    it("debe permitir a super_admin ver todas las categorías", () => {
      expect(validatePhotoViewPermission("super_admin", "disenos")).toBe(true);
      expect(validatePhotoViewPermission("super_admin", "avance")).toBe(true);
      expect(validatePhotoViewPermission("super_admin", "cotizacion")).toBe(true);
    });
  });

  describe("validatePhotoDeletePermission", () => {
    it("debe permitir a jefe_taller eliminar sus propias fotos en 'avance'", () => {
      const result = validatePhotoDeletePermission("jefe_taller", "avance", 1, 1);
      expect(result).toBe(true);
    });

    it("debe rechazar a jefe_taller eliminar fotos de otros en 'avance'", () => {
      const result = validatePhotoDeletePermission("jefe_taller", "avance", 1, 2);
      expect(result).toBe(false);
    });

    it("debe rechazar a jefe_taller eliminar fotos en 'disenos'", () => {
      const result = validatePhotoDeletePermission("jefe_taller", "disenos", 1, 1);
      expect(result).toBe(false);
    });

    it("debe permitir a operario eliminar sus propias fotos en 'instalacion'", () => {
      const result = validatePhotoDeletePermission("operario", "instalacion", 1, 1);
      expect(result).toBe(true);
    });

    it("debe rechazar a operario eliminar fotos de otros en 'instalacion'", () => {
      const result = validatePhotoDeletePermission("operario", "instalacion", 1, 2);
      expect(result).toBe(false);
    });

    it("debe rechazar a operario eliminar fotos en 'disenos'", () => {
      const result = validatePhotoDeletePermission("operario", "disenos", 1, 1);
      expect(result).toBe(false);
    });

    it("debe permitir a disenador eliminar sus propias fotos", () => {
      const result = validatePhotoDeletePermission("disenador", "disenos", 1, 1);
      expect(result).toBe(true);
    });

    it("debe rechazar a disenador eliminar fotos de otros", () => {
      const result = validatePhotoDeletePermission("disenador", "disenos", 1, 2);
      expect(result).toBe(false);
    });

    it("debe permitir a admin eliminar cualquier foto", () => {
      expect(validatePhotoDeletePermission("admin", "disenos", 1, 2)).toBe(true);
      expect(validatePhotoDeletePermission("admin", "avance", 1, 2)).toBe(true);
    });

    it("debe permitir a super_admin eliminar cualquier foto", () => {
      expect(validatePhotoDeletePermission("super_admin", "disenos", 1, 2)).toBe(true);
      expect(validatePhotoDeletePermission("super_admin", "avance", 1, 2)).toBe(true);
    });
  });
});
