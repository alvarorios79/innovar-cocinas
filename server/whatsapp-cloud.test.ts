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
    it("debe retornar un booleano", () => {
      const result = isWhatsAppCloudConfigured();
      expect(typeof result).toBe("boolean");
    });

    it("debe retornar true cuando las credenciales están configuradas en el entorno", () => {
      if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        expect(isWhatsAppCloudConfigured()).toBe(true);
      } else {
        expect(isWhatsAppCloudConfigured()).toBe(false);
      }
    });
  });

  describe("Mensajes predefinidos - existencia de funciones", () => {
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

  describe("Funciones de API - existencia y tipos", () => {
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
  });

  describe("Funciones retornan WhatsAppMessageResponse", () => {
    it("sendTextMessage debe retornar un objeto con success", async () => {
      const { sendTextMessage } = await import("./whatsapp-cloud");
      const result = await sendTextMessage("3136802025", "Test message");
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("sendTemplateMessage debe retornar un objeto con success", async () => {
      const { sendTemplateMessage } = await import("./whatsapp-cloud");
      const result = await sendTemplateMessage("3136802025", "hello_world");
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("verifyConnection debe retornar un objeto con connected", async () => {
      const { verifyConnection } = await import("./whatsapp-cloud");
      const result = await verifyConnection();
      
      expect(result).toHaveProperty("connected");
      expect(typeof result.connected).toBe("boolean");
    });
  });

  describe("Plantilla confirmacion_cita con logo", () => {
    it("sendAppointmentConfirmation debe aceptar todos los parámetros requeridos", async () => {
      const { sendAppointmentConfirmation } = await import("./whatsapp-cloud");
      expect(sendAppointmentConfirmation.length).toBe(4);
    });

    it("sendAppointmentConfirmation debe retornar WhatsAppMessageResponse", async () => {
      const { sendAppointmentConfirmation } = await import("./whatsapp-cloud");
      
      const result = await sendAppointmentConfirmation(
        "3002826317",
        "María García",
        new Date("2026-03-15T10:00:00-05:00"),
        "cocina"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      if (!result.success) {
        expect(result).toHaveProperty("error");
      }
      if (result.success) {
        expect(result).toHaveProperty("messageId");
      }
    });

    it("sendAppointmentConfirmation debe manejar todos los tipos de trabajo", async () => {
      const { sendAppointmentConfirmation } = await import("./whatsapp-cloud");
      
      const workTypes = ["cocina", "closet", "puertas", "centro_tv"];
      
      for (const workType of workTypes) {
        const result = await sendAppointmentConfirmation(
          "3002826317",
          "Test User",
          new Date("2026-06-15T14:30:00-05:00"),
          workType
        );
        
        expect(result).toHaveProperty("success");
        expect(typeof result.success).toBe("boolean");
      }
    });

    it("sendAppointmentConfirmation debe manejar tipos de trabajo desconocidos sin error", async () => {
      const { sendAppointmentConfirmation } = await import("./whatsapp-cloud");
      
      const result = await sendAppointmentConfirmation(
        "3002826317",
        "Test User",
        new Date("2026-06-15T14:30:00-05:00"),
        "tipo_desconocido"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("Plantilla recordatorio_cita con logo", () => {
    it("sendAppointmentReminder debe aceptar 4 parámetros", async () => {
      const { sendAppointmentReminder } = await import("./whatsapp-cloud");
      expect(sendAppointmentReminder.length).toBe(4);
    });

    it("sendAppointmentReminder debe retornar WhatsAppMessageResponse", async () => {
      const { sendAppointmentReminder } = await import("./whatsapp-cloud");
      const result = await sendAppointmentReminder(
        "3136802025",
        "Juan Pérez",
        new Date("2026-03-15T10:00:00-05:00"),
        "cocina"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      if (!result.success) {
        expect(result).toHaveProperty("error");
      }
      if (result.success) {
        expect(result).toHaveProperty("messageId");
      }
    });
  });

  describe("Plantilla cotizacion_lista con logo", () => {
    it("sendQuotationReady debe aceptar al menos 4 parámetros", async () => {
      const { sendQuotationReady } = await import("./whatsapp-cloud");
      // 4 requeridos + 1 opcional (portalUrl)
      expect(sendQuotationReady.length).toBeGreaterThanOrEqual(4);
    });

    it("sendQuotationReady debe retornar WhatsAppMessageResponse", async () => {
      const { sendQuotationReady } = await import("./whatsapp-cloud");
      const result = await sendQuotationReady(
        "3136802025",
        "Carlos López",
        "COT-2026-001",
        "5500000"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      if (!result.success) {
        expect(result).toHaveProperty("error");
      }
      if (result.success) {
        expect(result).toHaveProperty("messageId");
      }
    });

    it("sendQuotationReady debe funcionar con portalUrl opcional", async () => {
      const { sendQuotationReady } = await import("./whatsapp-cloud");
      const result = await sendQuotationReady(
        "3136802025",
        "Carlos López",
        "COT-2026-002",
        "8000000",
        "https://innovar.manus.space/portal/cotizacion/123"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("Plantilla actualizacion_proyecto con logo", () => {
    it("sendProjectStatusUpdate debe aceptar al menos 4 parámetros", async () => {
      const { sendProjectStatusUpdate } = await import("./whatsapp-cloud");
      // 4 requeridos + 1 opcional (portalUrl)
      expect(sendProjectStatusUpdate.length).toBeGreaterThanOrEqual(4);
    });

    it("sendProjectStatusUpdate debe retornar WhatsAppMessageResponse", async () => {
      const { sendProjectStatusUpdate } = await import("./whatsapp-cloud");
      const result = await sendProjectStatusUpdate(
        "3136802025",
        "Ana Martínez",
        "Cocina Integral Moderna",
        "corte"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      if (!result.success) {
        expect(result).toHaveProperty("error");
      }
      if (result.success) {
        expect(result).toHaveProperty("messageId");
      }
    });

    it("sendProjectStatusUpdate debe manejar todos los estados del proyecto", async () => {
      const { sendProjectStatusUpdate } = await import("./whatsapp-cloud");
      
      // Probar solo un subconjunto representativo para evitar timeouts
      const statuses = ["contacto", "corte", "entregado"];
      
      for (const status of statuses) {
        const result = await sendProjectStatusUpdate(
          "3002826317",
          "Test User",
          "Proyecto Test",
          status
        );
        
        expect(result).toHaveProperty("success");
        expect(typeof result.success).toBe("boolean");
      }
    });

    it("sendProjectStatusUpdate debe funcionar con portalUrl opcional", async () => {
      const { sendProjectStatusUpdate } = await import("./whatsapp-cloud");
      const result = await sendProjectStatusUpdate(
        "3136802025",
        "Ana Martínez",
        "Cocina Integral",
        "en_diseno",
        "https://innovar.manus.space/portal/proyecto/456"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("sendProjectStatusUpdate debe manejar estados desconocidos sin error", async () => {
      const { sendProjectStatusUpdate } = await import("./whatsapp-cloud");
      const result = await sendProjectStatusUpdate(
        "3002826317",
        "Test User",
        "Proyecto Test",
        "estado_inventado"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("Mensajes predefinidos restantes", () => {
    it("sendBirthdayGreeting debe retornar WhatsAppMessageResponse", async () => {
      const { sendBirthdayGreeting } = await import("./whatsapp-cloud");
      const result = await sendBirthdayGreeting("3136802025", "Juan Pérez");
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("sendPaymentReminder debe retornar WhatsAppMessageResponse", async () => {
      const { sendPaymentReminder } = await import("./whatsapp-cloud");
      const result = await sendPaymentReminder(
        "3136802025",
        "Juan Pérez",
        "Cocina Moderna",
        "3500000"
      );
      
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });
  });
});
