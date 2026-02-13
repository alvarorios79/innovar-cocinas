import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizeText, sanitizeForEmail, sanitizePhone, sanitizeEmail, sanitizeObject } from "./sanitize";

describe("Sanitización de entradas de texto", () => {
  describe("sanitizeHtml", () => {
    it("debe escapar caracteres HTML peligrosos", () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it("debe preservar tildes y caracteres del español", () => {
      expect(sanitizeHtml("José María García Ñoño")).toBe("José María García Ñoño");
    });

    it("debe preservar emojis", () => {
      expect(sanitizeHtml("Hola 👋 mundo 🌍")).toBe("Hola 👋 mundo 🌍");
    });

    it("debe manejar strings vacíos y null-like", () => {
      expect(sanitizeHtml("")).toBe("");
      expect(sanitizeHtml(null as any)).toBe(null);
      expect(sanitizeHtml(undefined as any)).toBe(undefined);
    });

    it("debe escapar ampersands", () => {
      expect(sanitizeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });
  });

  describe("sanitizeText", () => {
    it("debe eliminar caracteres de control invisibles", () => {
      const result = sanitizeText("Hola\x00Mundo\x07");
      // Los caracteres de control se eliminan (no se reemplazan por espacio)
      expect(result).not.toContain("\x00");
      expect(result).not.toContain("\x07");
    });

    it("debe preservar saltos de línea", () => {
      expect(sanitizeText("Línea 1\nLínea 2")).toBe("Línea 1\nLínea 2");
    });

    it("debe recortar espacios al inicio y final", () => {
      expect(sanitizeText("  Hola mundo  ")).toBe("Hola mundo");
    });

    it("debe normalizar espacios múltiples", () => {
      expect(sanitizeText("Hola    mundo")).toBe("Hola mundo");
    });

    it("debe preservar contenido válido en español", () => {
      const input = "Cocina integral en L con mesón de granito. Medidas: 3.5m x 2.1m. Incluye herrajes Blum.";
      expect(sanitizeText(input)).toBe(input);
    });
  });

  describe("sanitizeForEmail", () => {
    it("debe aplicar sanitizeText + sanitizeHtml", () => {
      const input = '  <b>Nota</b>: Cocina de 3.5m  ';
      const result = sanitizeForEmail(input);
      expect(result).toBe("&lt;b&gt;Nota&lt;/b&gt;: Cocina de 3.5m");
    });
  });

  describe("sanitizePhone", () => {
    it("debe preservar formato de teléfono colombiano", () => {
      expect(sanitizePhone("+57 313 680 2025")).toBe("+57 313 680 2025");
    });

    it("debe eliminar caracteres no válidos", () => {
      expect(sanitizePhone("313<script>680")).toBe("313680");
    });

    it("debe manejar strings vacíos", () => {
      expect(sanitizePhone("")).toBe("");
    });
  });

  describe("sanitizeEmail", () => {
    it("debe preservar emails válidos", () => {
      expect(sanitizeEmail("cliente@ejemplo.com")).toBe("cliente@ejemplo.com");
    });

    it("debe convertir a minúsculas", () => {
      expect(sanitizeEmail("Cliente@Ejemplo.COM")).toBe("cliente@ejemplo.com");
    });

    it("debe eliminar caracteres no válidos", () => {
      const result = sanitizeEmail("cliente<script>@ejemplo.com");
      // Los caracteres < y > se eliminan, pero el texto 'script' permanece
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).toContain("@ejemplo.com");
    });
  });

  describe("sanitizeObject", () => {
    it("debe sanitizar solo campos de texto", () => {
      const obj = { name: "  José  ", age: 30, active: true };
      const result = sanitizeObject(obj);
      expect(result.name).toBe("José");
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
    });

    it("debe sanitizar solo campos especificados", () => {
      const obj = { name: "  José  ", notes: "  Notas  " };
      const result = sanitizeObject(obj, ["name"]);
      expect(result.name).toBe("José");
      expect(result.notes).toBe("  Notas  ");
    });
  });
});

describe("Integración de sanitización en routers.ts", () => {
  it("routers.ts debe importar funciones de sanitización", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8");
    
    expect(content).toContain('import { sanitizeText, sanitizeHtml, sanitizeForEmail, sanitizePhone, sanitizeEmail } from "./sanitize"');
  });

  it("routers.ts debe usar sanitizeText en campos de texto libre", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8");
    
    // Verificar que se usa sanitizeText en los puntos críticos
    const sanitizeTextCount = (content.match(/sanitizeText\(/g) || []).length;
    expect(sanitizeTextCount).toBeGreaterThanOrEqual(10);
  });

  it("routers.ts debe usar sanitizePhone en campos de teléfono", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8");
    
    const sanitizePhoneCount = (content.match(/sanitizePhone\(/g) || []).length;
    expect(sanitizePhoneCount).toBeGreaterThanOrEqual(3);
  });

  it("routers.ts debe usar sanitizeEmail en campos de email", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8");
    
    const sanitizeEmailCount = (content.match(/sanitizeEmail\(/g) || []).length;
    expect(sanitizeEmailCount).toBeGreaterThanOrEqual(4);
  });
});
