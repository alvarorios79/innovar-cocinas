import { describe, it, expect } from "vitest";

describe("VAPID Environment Variables", () => {
  it("VAPID_PUBLIC_KEY debe estar definida en variables de entorno", () => {
    expect(process.env.VAPID_PUBLIC_KEY).toBeDefined();
    expect(process.env.VAPID_PUBLIC_KEY).not.toBe("");
    expect(typeof process.env.VAPID_PUBLIC_KEY).toBe("string");
  });

  it("VAPID_PRIVATE_KEY debe estar definida en variables de entorno", () => {
    expect(process.env.VAPID_PRIVATE_KEY).toBeDefined();
    expect(process.env.VAPID_PRIVATE_KEY).not.toBe("");
    expect(typeof process.env.VAPID_PRIVATE_KEY).toBe("string");
  });

  it("VAPID_PUBLIC_KEY debe tener formato válido de clave pública Base64URL", () => {
    const key = process.env.VAPID_PUBLIC_KEY!;
    // Las claves públicas VAPID son Base64URL encoded y tienen ~87 caracteres
    expect(key.length).toBeGreaterThan(50);
    expect(/^[A-Za-z0-9_-]+$/.test(key)).toBe(true);
  });

  it("VAPID_PRIVATE_KEY debe tener formato válido de clave privada Base64URL", () => {
    const key = process.env.VAPID_PRIVATE_KEY!;
    // Las claves privadas VAPID son Base64URL encoded y tienen ~43 caracteres
    expect(key.length).toBeGreaterThan(30);
    expect(/^[A-Za-z0-9_-]+$/.test(key)).toBe(true);
  });

  it("push-notifications.ts no debe contener claves VAPID hardcodeadas", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "push-notifications.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    
    // No debe haber fallback con || "clave..."
    expect(content).not.toMatch(/VAPID_PUBLIC_KEY\s*=\s*process\.env\.VAPID_PUBLIC_KEY\s*\|\|/);
    expect(content).not.toMatch(/VAPID_PRIVATE_KEY\s*=\s*process\.env\.VAPID_PRIVATE_KEY\s*\|\|/);
    
    // No debe contener las claves hardcodeadas originales
    expect(content).not.toContain("BEl62iUYgUivxIkv69yViEuiBIa");
    expect(content).not.toContain("UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls");
  });
});
