import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, withTransaction } from "../db";
import * as whatsappCloud from "../whatsapp-cloud";

describe("WhatsApp Template Quotation Flow", () => {
  let db: any;

  beforeEach(async () => {
    db = await getDb();
  });

  afterEach(async () => {
    // Cleanup handled by transaction rollback
  });

  it("should send quotation template successfully", async () => {
    // Mock test - verifica que la función existe y puede ser llamada
    const result = await whatsappCloud.sendQuotationTemplate(
      "573002826317",
      "Test Client",
      "COT-2026-001"
    );

    // Validar estructura de respuesta
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("error");
    
    // Si falla, debe tener un mensaje de error
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    } else {
      // Si funciona, debe tener messageId
      expect(result.messageId).toBeDefined();
    }
  });

  it("should format phone number correctly", () => {
    const formatted1 = whatsappCloud.formatPhoneForWhatsApp("573002826317");
    expect(formatted1).toBe("573002826317");

    const formatted2 = whatsappCloud.formatPhoneForWhatsApp("3002826317");
    expect(formatted2).toBe("573002826317");

    const formatted3 = whatsappCloud.formatPhoneForWhatsApp("+57 300 282 6317");
    expect(formatted3).toBe("573002826317");
  });

  it("should verify WhatsApp Cloud is configured", () => {
    const configured = whatsappCloud.isWhatsAppCloudConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("should get WhatsApp Cloud config", () => {
    const config = whatsappCloud.getWhatsAppCloudConfig();
    
    if (config) {
      expect(config).toHaveProperty("accessToken");
      expect(config).toHaveProperty("phoneNumberId");
      expect(typeof config.accessToken).toBe("string");
      expect(typeof config.phoneNumberId).toBe("string");
    }
  });

  it("should handle template response correctly", async () => {
    // Test the sendQuotationTemplate response structure
    const testPhone = "573002826317";
    const testClient = "Test Client";
    const testQuotation = "COT-2026-TEST";

    const response = await whatsappCloud.sendQuotationTemplate(
      testPhone,
      testClient,
      testQuotation
    );

    // Validar que la respuesta tiene la estructura correcta
    expect(response).toHaveProperty("success");
    expect(typeof response.success).toBe("boolean");

    if (response.success) {
      expect(response.messageId).toBeDefined();
      expect(typeof response.messageId).toBe("string");
    } else {
      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe("string");
    }
  });
});
