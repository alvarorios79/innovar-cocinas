import { describe, it, expect } from "vitest";
import { validatePhotoUploadPermission } from "./routers/helpers";

describe("Photo Upload Permissions - jefe_taller", () => {
  it("debe permitir a jefe_taller subir fotos en categoría 'avance'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "avance");
    expect(result).toBe(true);
  });

  it("debe permitir a jefe_taller subir fotos en categoría 'instalacion'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "instalacion");
    expect(result).toBe(true);
  });

  it("debe permitir a jefe_taller subir fotos en categoría 'entrega'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "entrega");
    expect(result).toBe(true);
  });

  it("debe rechazar a jefe_taller subir fotos en categoría 'disenos'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "disenos");
    expect(result).toBe(false);
  });

  it("debe permitir a operario subir fotos en categoría 'avance'", () => {
    const result = validatePhotoUploadPermission("operario", "avance");
    expect(result).toBe(true);
  });

  it("debe permitir a operario subir fotos en categoría 'instalacion'", () => {
    const result = validatePhotoUploadPermission("operario", "instalacion");
    expect(result).toBe(true);
  });

  it("debe permitir a operario subir fotos en categoría 'entrega'", () => {
    const result = validatePhotoUploadPermission("operario", "entrega");
    expect(result).toBe(true);
  });

  it("debe rechazar a operario subir fotos en categoría 'disenos'", () => {
    const result = validatePhotoUploadPermission("operario", "disenos");
    expect(result).toBe(false);
  });

  it("debe permitir a admin subir fotos en cualquier categoría", () => {
    expect(validatePhotoUploadPermission("admin", "avance")).toBe(true);
    expect(validatePhotoUploadPermission("admin", "disenos")).toBe(true);
    expect(validatePhotoUploadPermission("admin", "entrega")).toBe(true);
  });

  it("debe permitir a super_admin subir fotos en cualquier categoría", () => {
    expect(validatePhotoUploadPermission("super_admin", "avance")).toBe(true);
    expect(validatePhotoUploadPermission("super_admin", "disenos")).toBe(true);
    expect(validatePhotoUploadPermission("super_admin", "entrega")).toBe(true);
  });

  it("debe permitir a disenador subir fotos en categoría 'disenos'", () => {
    const result = validatePhotoUploadPermission("disenador", "disenos");
    expect(result).toBe(true);
  });

  it("debe rechazar a disenador subir fotos en categoría 'avance'", () => {
    const result = validatePhotoUploadPermission("disenador", "avance");
    expect(result).toBe(false);
  });

  it("debe permitir a comercial subir fotos en categoría 'cotizacion' y 'medidas'", () => {
    expect(validatePhotoUploadPermission("comercial", "cotizacion")).toBe(true);
    expect(validatePhotoUploadPermission("comercial", "medidas")).toBe(true);
  });

  it("debe rechazar a comercial subir fotos en otras categorías", () => {
    expect(validatePhotoUploadPermission("comercial", "avance")).toBe(false);
    expect(validatePhotoUploadPermission("comercial", "disenos")).toBe(false);
  });
});
