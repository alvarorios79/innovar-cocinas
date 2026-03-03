import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanupTempFile, withTempFile, cleanupOrphanedPDFs } from "./tmp-cleanup";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

describe("Limpieza de archivos temporales", () => {
  const testDir = "/tmp/test-cleanup";
  
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe("cleanupTempFile", () => {
    it("debe eliminar un archivo existente", () => {
      const filepath = join(testDir, "test.pdf");
      writeFileSync(filepath, "test content");
      expect(existsSync(filepath)).toBe(true);
      
      cleanupTempFile(filepath);
      expect(existsSync(filepath)).toBe(false);
    });

    it("no debe lanzar error si el archivo no existe", () => {
      expect(() => cleanupTempFile("/tmp/nonexistent.pdf")).not.toThrow();
    });

    it("no debe lanzar error con string vacío", () => {
      expect(() => cleanupTempFile("")).not.toThrow();
    });
  });

  describe("withTempFile", () => {
    it("debe limpiar archivo después de función exitosa", async () => {
      const filepath = join(testDir, "with-temp.pdf");
      writeFileSync(filepath, "test content");

      const result = await withTempFile(filepath, async () => {
        expect(existsSync(filepath)).toBe(true);
        return "success";
      });

      expect(result).toBe("success");
      expect(existsSync(filepath)).toBe(false);
    });

    it("debe limpiar archivo incluso si la función falla", async () => {
      const filepath = join(testDir, "with-temp-error.pdf");
      writeFileSync(filepath, "test content");

      await expect(
        withTempFile(filepath, async () => {
          throw new Error("test error");
        })
      ).rejects.toThrow("test error");

      expect(existsSync(filepath)).toBe(false);
    });
  });

  describe("cleanupOrphanedPDFs", () => {
    it("debe retornar conteo de archivos limpiados", () => {
      const result = cleanupOrphanedPDFs(30);
      expect(result).toHaveProperty("cleaned");
      expect(result).toHaveProperty("errors");
      expect(typeof result.cleaned).toBe("number");
      expect(typeof result.errors).toBe("number");
    });
  });
});
