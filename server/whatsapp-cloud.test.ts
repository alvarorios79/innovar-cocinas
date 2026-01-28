import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatPhoneForWhatsApp,
  isWhatsAppCloudConfigured,
} from "./whatsapp-cloud";

describe("WhatsApp Cloud Service", () => {
  describe("formatPhoneForWhatsApp", () => {
    it("debe agregar código de país 57 a número colombiano de 10 dígitos", () => {
      const result = formatPhoneForWhatsApp("3136802025");
      expect(result).toBe("573136802025");
    });

    it("no debe duplicar código de país si ya está presente", () => {
      const result = formatPhoneForWhatsApp("573136802025");
      expect(result).toBe("573136802025");
    });

    it("debe limpiar caracteres no numéricos", () => {
      const result = formatPhoneForWhatsApp("+57 313-680-2025");
      expect(result).toBe("573136802025");
    });

    it("debe manejar números con espacios", () => {
      const result = formatPhoneForWhatsApp("313 680 2025");
      expect(result).toBe("573136802025");
    });

    it("debe manejar números con paréntesis", () => {
      const result = formatPhoneForWhatsApp("(313) 680-2025");
      expect(result).toBe("573136802025");
    });

    it("debe agregar 57 a números que no empiezan con 3", () => {
      const result = formatPhoneForWhatsApp("6012345678");
      expect(result).toBe("576012345678");
    });
  });

  describe("isWhatsAppCloudConfigured", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("debe retornar false cuando no hay credenciales configuradas", () => {
      // Las variables de entorno no están configuradas por defecto en tests
      const result = isWhatsAppCloudConfigured();
      expect(result).toBe(false);
    });
  });

  describe("Mensajes predefinidos", () => {
    it("debe existir la función sendAppointmentConfirmation", async () => {
      const { sendAppointmentConfirmation } = await import("./whatsapp-cloud");
      expect(typeof sendAppointmentConfirmation).toBe("function");
    });

    it("debe existir la función sendAppointmentReminder", async () => {
      const { sendAppointmentReminder } = await import("./whatsapp-cloud");
      expect(typeof sendAppointmentReminder).toBe("function");
    });

    it("debe existir la función sendQuotationReady", async () => {
      const { sendQuotationReady } = await import("./whatsapp-cloud");
      expect(typeof sendQuotationReady).toBe("function");
    });

    it("debe existir la función sendProjectStatusUpdate", async () => {
      const { sendProjectStatusUpdate } = await import("./whatsapp-cloud");
      expect(typeof sendProjectStatusUpdate).toBe("function");
    });

    it("debe existir la función sendBirthdayGreeting", async () => {
      const { sendBirthdayGreeting } = await import("./whatsapp-cloud");
      expect(typeof sendBirthdayGreeting).toBe("function");
    });

    it("debe existir la función sendPaymentReminder", async () => {
      const { sendPaymentReminder } = await import("./whatsapp-cloud");
      expect(typeof sendPaymentReminder).toBe("function");
    });
  });

  describe("Funciones de API", () => {
    it("debe existir la función sendTextMessage", async () => {
      const { sendTextMessage } = await import("./whatsapp-cloud");
      expect(typeof sendTextMessage).toBe("function");
    });

    it("debe existir la función sendTemplateMessage", async () => {
      const { sendTemplateMessage } = await import("./whatsapp-cloud");
      expect(typeof sendTemplateMessage).toBe("function");
    });

    it("debe existir la función verifyConnection", async () => {
      const { verifyConnection } = await import("./whatsapp-cloud");
      expect(typeof verifyConnection).toBe("function");
    });

    it("sendTextMessage debe retornar error cuando no está configurado", async () => {
      const { sendTextMessage } = await import("./whatsapp-cloud");
      const result = await sendTextMessage("3136802025", "Test message");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("no está configurado");
    });

    it("sendTemplateMessage debe retornar error cuando no está configurado", async () => {
      const { sendTemplateMessage } = await import("./whatsapp-cloud");
      const result = await sendTemplateMessage("3136802025", "hello_world");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("no está configurado");
    });

    it("verifyConnection debe retornar error cuando no está configurado", async () => {
      const { verifyConnection } = await import("./whatsapp-cloud");
      const result = await verifyConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toContain("no configuradas");
    });
  });

  describe("Mensajes predefinidos sin configuración", () => {
    it("sendAppointmentConfirmation debe retornar error cuando no está configurado", async () => {
      const { sendAppointmentConfirmation } = await import("./whatsapp-cloud");
      const result = await sendAppointmentConfirmation(
        "3136802025",
        "Juan Pérez",
        new Date(),
        "cocina"
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("no está configurado");
    });

    it("sendProjectStatusUpdate debe retornar error cuando no está configurado", async () => {
      const { sendProjectStatusUpdate } = await import("./whatsapp-cloud");
      const result = await sendProjectStatusUpdate(
        "3136802025",
        "Juan Pérez",
        "Cocina Moderna",
        "en_produccion"
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("no está configurado");
    });

    it("sendBirthdayGreeting debe retornar error cuando no está configurado", async () => {
      const { sendBirthdayGreeting } = await import("./whatsapp-cloud");
      const result = await sendBirthdayGreeting("3136802025", "Juan Pérez");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("no está configurado");
    });
  });
});
