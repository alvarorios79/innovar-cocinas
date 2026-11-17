import { describe, expect, it } from "vitest";
import { nombreYTipo, subidaSignature, subidaSignatureOk } from "./redes-subida-routes";

describe("subida de imágenes para redes (puerta firmada)", () => {
  const secret = "clave-de-prueba";
  const now = 1_800_000_000_000;

  it("acepta firma correcta y reciente; rechaza otro nombre, otra clave o vencida", () => {
    const sig = subidaSignature("01.jpg", now, secret);
    expect(subidaSignatureOk("01.jpg", now, sig, secret, now + 1000)).toBe(true);
    expect(subidaSignatureOk("02.jpg", now, sig, secret, now)).toBe(false);
    expect(subidaSignatureOk("01.jpg", now, sig, "otra", now)).toBe(false);
    expect(subidaSignatureOk("01.jpg", now, sig, secret, now + 6 * 60_000)).toBe(false);
    expect(subidaSignatureOk("01.jpg", now, "abc", secret, now)).toBe(false);
  });

  it("solo deja subir imágenes y videos, con nombre limpio", () => {
    expect(nombreYTipo("2026-11-19 Baños 01.JPG")).toEqual({ seguro: "2026-11-19-Banos-01.jpg", tipo: "image/jpeg" });
    expect(nombreYTipo("reel.mp4")?.tipo).toBe("video/mp4");
    expect(nombreYTipo("../../etc/passwd")).toBeNull();
    expect(nombreYTipo("virus.exe")).toBeNull();
    expect(nombreYTipo("sin_extension")).toBeNull();
  });
});
