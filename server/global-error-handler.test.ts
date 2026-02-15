import { describe, it, expect } from "vitest";
import { initGlobalErrorHandlers } from "./global-error-handler";

describe("Global Error Handler", () => {
  it("debe exportar initGlobalErrorHandlers como función", () => {
    expect(typeof initGlobalErrorHandlers).toBe("function");
  });

  it("debe ejecutarse sin errores", () => {
    // No debe lanzar error al inicializar
    expect(() => initGlobalErrorHandlers()).not.toThrow();
  });

  it("debe registrar handlers en process", () => {
    // Verificar que process tiene listeners para uncaughtException
    const listeners = process.listeners("uncaughtException");
    expect(listeners.length).toBeGreaterThan(0);
  });

  it("debe registrar handlers para unhandledRejection", () => {
    const listeners = process.listeners("unhandledRejection");
    expect(listeners.length).toBeGreaterThan(0);
  });
});
