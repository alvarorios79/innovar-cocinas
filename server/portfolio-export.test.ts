import { describe, expect, it } from "vitest";
import { exportSignature, exportSignatureOk } from "./portfolio-export-routes";

describe("exportación del Portafolio (puerta de lectura firmada)", () => {
  const secret = "clave-de-prueba";
  const now = 1_800_000_000_000;

  it("acepta una firma correcta y reciente", () => {
    expect(exportSignatureOk(59, now, exportSignature(59, now, secret), secret, now + 1000)).toBe(true);
  });
  it("rechaza otra galería, otra clave o una firma mal formada", () => {
    const sig = exportSignature(59, now, secret);
    expect(exportSignatureOk(60, now, sig, secret, now)).toBe(false);
    expect(exportSignatureOk(59, now, sig, "otra", now)).toBe(false);
    expect(exportSignatureOk(59, now, "abc", secret, now)).toBe(false);
  });
  it("rechaza una petición vencida (más de 5 minutos)", () => {
    expect(exportSignatureOk(59, now, exportSignature(59, now, secret), secret, now + 6 * 60_000)).toBe(false);
  });
});
