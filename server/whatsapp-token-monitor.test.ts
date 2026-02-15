import { describe, it, expect } from "vitest";
import { getWhatsAppTokenStatus, startWhatsAppTokenMonitor } from "./whatsapp-token-monitor";

describe("WhatsApp Token Monitor", () => {
  it("debe exportar getWhatsAppTokenStatus como función", () => {
    expect(typeof getWhatsAppTokenStatus).toBe("function");
  });

  it("debe retornar estado inicial válido", () => {
    const status = getWhatsAppTokenStatus();
    expect(status).toHaveProperty("isValid");
    expect(status).toHaveProperty("lastCheck");
    expect(status).toHaveProperty("lastError");
    expect(status).toHaveProperty("consecutiveFailures");
    expect(typeof status.isValid).toBe("boolean");
    expect(typeof status.consecutiveFailures).toBe("number");
  });

  it("debe exportar startWhatsAppTokenMonitor como función", () => {
    expect(typeof startWhatsAppTokenMonitor).toBe("function");
  });

  it("estado inicial debe ser isValid=true con 0 fallos", () => {
    const status = getWhatsAppTokenStatus();
    expect(status.isValid).toBe(true);
    expect(status.consecutiveFailures).toBe(0);
    expect(status.lastError).toBeNull();
  });
});
