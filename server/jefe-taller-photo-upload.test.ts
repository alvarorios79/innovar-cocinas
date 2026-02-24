import { describe, it, expect } from "vitest";
import { validatePhotoUploadPermission } from "./routers/helpers";

describe("Photo Upload Permissions - jefe_taller", () => {
  it("debe permitir a jefe_taller subir fotos en stage 'corte'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "corte", "avance");
    expect(result).toBe(true);
  });

  it("debe permitir a jefe_taller subir fotos en stage 'enchape'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "enchape", "avance");
    expect(result).toBe(true);
  });

  it("debe permitir a jefe_taller subir fotos en stage 'ensamble'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "ensamble", "avance");
    expect(result).toBe(true);
  });

  it("debe permitir a jefe_taller subir fotos en stage 'final' (instalación)", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "final", "instalacion");
    expect(result).toBe(true);
  });

  it("debe rechazar a jefe_taller subir fotos en stage 'diseno'", () => {
    const result = validatePhotoUploadPermission("jefe_taller", "diseno", "disenos");
    expect(result).toBe(false);
  });

  it("debe permitir a operario subir fotos en stage 'corte'", () => {
    const result = validatePhotoUploadPermission("operario", "corte", "avance");
    expect(result).toBe(true);
  });

  it("debe permitir a operario subir fotos en stage 'enchape'", () => {
    const result = validatePhotoUploadPermission("operario", "enchape", "avance");
    expect(result).toBe(true);
  });

  it("debe permitir a operario subir fotos en stage 'ensamble'", () => {
    const result = validatePhotoUploadPermission("operario", "ensamble", "avance");
    expect(result).toBe(true);
  });

  it("debe rechazar a operario subir fotos en stage 'final'", () => {
    const result = validatePhotoUploadPermission("operario", "final", "entrega");
    expect(result).toBe(false);
  });

  it("debe permitir a admin subir fotos en cualquier stage", () => {
    expect(validatePhotoUploadPermission("admin", "corte", "avance")).toBe(true);
    expect(validatePhotoUploadPermission("admin", "diseno", "disenos")).toBe(true);
    expect(validatePhotoUploadPermission("admin", "final", "entrega")).toBe(true);
  });

  it("debe permitir a super_admin subir fotos en cualquier stage", () => {
    expect(validatePhotoUploadPermission("super_admin", "corte", "avance")).toBe(true);
    expect(validatePhotoUploadPermission("super_admin", "diseno", "disenos")).toBe(true);
    expect(validatePhotoUploadPermission("super_admin", "final", "entrega")).toBe(true);
  });

  it("debe rechazar a disenador subir fotos en stage 'corte'", () => {
    const result = validatePhotoUploadPermission("disenador", "corte", "avance");
    expect(result).toBe(false);
  });

  it("debe permitir a disenador subir fotos en stage 'diseno'", () => {
    const result = validatePhotoUploadPermission("disenador", "diseno", "disenos");
    expect(result).toBe(true);
  });
});
