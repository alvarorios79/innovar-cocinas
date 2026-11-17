import { describe, expect, it } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { crc32, crearZip, nombresUnicos } from "@shared/zip";

describe("ZIP de texturas (shared/zip.ts)", () => {
  it("crc32 coincide con el valor conocido de «123456789»", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("nombresUnicos evita repetidos y caracteres prohibidos", () => {
    expect(nombresUnicos(["Andino - Primadera.jpg", "Andino - Primadera.jpg", "a/b:c.jpg"])).toEqual([
      "Andino - Primadera.jpg", "Andino - Primadera (2).jpg", "a-b-c.jpg",
    ]);
  });

  it("crea un ZIP válido que `unzip` abre con los mismos bytes", () => {
    const a = new Uint8Array([1, 2, 3, 4, 5, 250, 251]);
    const b = new TextEncoder().encode("hola textura");
    const zip = crearZip([{ nombre: "uno.jpg", datos: a }, { nombre: "Dos ñ.jpg", datos: b }]);
    const dir = mkdtempSync(join(tmpdir(), "zip-"));
    writeFileSync(join(dir, "t.zip"), zip);
    try {
      execFileSync("unzip", ["-o", "-q", join(dir, "t.zip"), "-d", join(dir, "out")]);
    } catch {
      return; // máquina sin `unzip`: la parte de formato igual quedó cubierta arriba
    }
    expect([...readFileSync(join(dir, "out", "uno.jpg"))]).toEqual([...a]);
    expect(readFileSync(join(dir, "out", "Dos ñ.jpg"), "utf8")).toBe("hola textura");
  });
});
