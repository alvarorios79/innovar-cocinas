import { describe, it, expect } from "vitest";
import { downloadName } from "./file-download-routes";
import { isPdfUrl, downloadHref } from "../client/src/lib/fileLinks";

describe("Descarga de archivos del proyecto", () => {
  it("reconoce PDF aunque la dirección de Firebase traiga token", () => {
    expect(isPdfUrl("https://firebasestorage.googleapis.com/v0/b/x/o/projects%2F1%2Fdiseno%2Fdespiece.pdf?alt=media&token=abc")).toBe(true);
    expect(isPdfUrl("https://d2xsxph8kpxj0f.cloudfront.net/p/diseno/1.pdf")).toBe(true);
    expect(isPdfUrl("https://firebasestorage.googleapis.com/v0/b/x/o/a%2Ffoto.jpg?alt=media")).toBe(false);
  });

  it("descarga por el CRM solo archivos de su almacenamiento", () => {
    expect(downloadHref("https://firebasestorage.googleapis.com/v0/b/x/o/a.pdf?alt=media", "Despiece")).toContain("/api/files/download?u=");
    expect(downloadHref("https://example.com/a.pdf", "x")).toBeNull();
  });

  it("el nombre lleva su extensión y sin caracteres raros", () => {
    const u = new URL("https://firebasestorage.googleapis.com/v0/b/x/o/projects%2F1%2Fdiseno%2F123.pdf?alt=media");
    expect(downloadName("Despiece cocina inferiores", "application/pdf", u)).toBe("Despiece cocina inferiores.pdf");
    expect(downloadName("Despiece.pdf", "application/pdf", u)).toBe("Despiece.pdf");
    expect(downloadName("a/b:c", null, u)).toBe("a b c.pdf");
    expect(downloadName("", "application/pdf", u)).toBe("archivo.pdf");
  });
});
