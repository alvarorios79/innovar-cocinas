import { describe, it, expect } from "vitest";
import {
  generateProjectMessage,
  generateWhatsAppLink,
  generatePortalUrl,
  getStatusLabel,
  getWorkTypeLabel,
  prepareWhatsAppNotification,
  type ProjectMessageData,
} from "./whatsapp-notifications";

describe("WhatsApp Notifications Service", () => {
  const baseMessageData: ProjectMessageData = {
    clientName: "Juan Pérez",
    clientPhone: "3136802025",
    projectName: "Cocina Moderna",
    projectId: 1,
    workType: "cocina",
    status: "pendiente",
    portalUrl: "https://innovar.com/portal?project=1",
  };

  describe("generateProjectMessage", () => {
    it("should generate welcome message for pendiente status", () => {
      const message = generateProjectMessage(baseMessageData);
      
      expect(message).toContain("¡Hola Juan Pérez!");
      expect(message).toContain("INNOVAR Cocinas Integrales");
      expect(message).toContain("Cocina Moderna");
      expect(message).toContain("Cocina Integral");
      expect(message).toContain(baseMessageData.portalUrl);
    });

    it("should generate design approval message for pendiente_cliente status", () => {
      const data = { ...baseMessageData, status: "pendiente_cliente" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("diseño está listo");
      expect(message).toContain("aprobación");
      expect(message).toContain(data.portalUrl);
    });

    it("should generate production message for corte status", () => {
      const data = { ...baseMessageData, status: "corte" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("CORTE");
      expect(message).toContain("producción");
    });

    it("should generate enchape message", () => {
      const data = { ...baseMessageData, status: "enchape" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("ENCHAPE");
      expect(message).toContain("acabados");
    });

    it("should generate ensamble message", () => {
      const data = { ...baseMessageData, status: "ensamble" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("ENSAMBLE");
      expect(message).toContain("armando");
    });

    it("should generate ready for installation message", () => {
      const data = { ...baseMessageData, status: "listo_instalacion" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("LISTO PARA INSTALACIÓN");
      expect(message).toContain("coordinar");
    });

    it("should generate delivered message with review link", () => {
      const data = { ...baseMessageData, status: "entregado" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("ENTREGADO");
      expect(message).toContain("Felicitaciones");
      expect(message).toContain("reseña");
    });

    it("should generate generic message for unknown status", () => {
      const data = { ...baseMessageData, status: "unknown_status" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("Juan Pérez");
      expect(message).toContain("Cocina Moderna");
      expect(message).toContain("actualizado");
    });

    it("should handle closet work type", () => {
      const data = { ...baseMessageData, workType: "closet" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("Closet");
    });

    it("should handle puertas work type", () => {
      const data = { ...baseMessageData, workType: "puertas" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("Puertas");
    });

    it("should handle centro_tv work type", () => {
      const data = { ...baseMessageData, workType: "centro_tv" };
      const message = generateProjectMessage(data);
      
      expect(message).toContain("Centro de TV");
    });
  });

  describe("generateWhatsAppLink", () => {
    it("should generate valid WhatsApp link with Colombian phone", () => {
      const link = generateWhatsAppLink("3136802025", "Hola mundo");
      
      expect(link).toBe("https://wa.me/573136802025?text=Hola%20mundo");
    });

    it("should not duplicate country code if already present", () => {
      const link = generateWhatsAppLink("573136802025", "Test");
      
      expect(link).toBe("https://wa.me/573136802025?text=Test");
    });

    it("should clean non-numeric characters from phone", () => {
      const link = generateWhatsAppLink("+57 313-680-2025", "Test");
      
      expect(link).toBe("https://wa.me/573136802025?text=Test");
    });

    it("should encode special characters in message", () => {
      const link = generateWhatsAppLink("3136802025", "Hola! ¿Cómo estás?");
      
      expect(link).toContain("Hola!");
      expect(link).toContain("%C3%B3mo");
    });

    it("should encode newlines in message", () => {
      const link = generateWhatsAppLink("3136802025", "Línea 1\nLínea 2");
      
      expect(link).toContain("%0A");
    });
  });

  describe("generatePortalUrl", () => {
    it("should generate correct portal URL", () => {
      const url = generatePortalUrl(123, "https://innovar.com");
      
      expect(url).toBe("https://innovar.com/portal?project=123");
    });

    it("should handle different base URLs", () => {
      const url = generatePortalUrl(456, "https://app.innovar.co");
      
      expect(url).toBe("https://app.innovar.co/portal?project=456");
    });
  });

  describe("getStatusLabel", () => {
    it("should return correct label for pendiente", () => {
      expect(getStatusLabel("pendiente")).toBe("Proyecto Registrado");
    });

    it("should return correct label for aprobado_diseno", () => {
      expect(getStatusLabel("aprobado_diseno")).toBe("Aprobado para Diseño");
    });

    it("should return correct label for en_diseno", () => {
      expect(getStatusLabel("en_diseno")).toBe("En Diseño");
    });

    it("should return correct label for pendiente_cliente", () => {
      expect(getStatusLabel("pendiente_cliente")).toBe("Diseño Listo - Pendiente Aprobación");
    });

    it("should return correct label for corte", () => {
      expect(getStatusLabel("corte")).toBe("En Producción - Corte");
    });

    it("should return correct label for enchape", () => {
      expect(getStatusLabel("enchape")).toBe("En Producción - Enchape");
    });

    it("should return correct label for ensamble", () => {
      expect(getStatusLabel("ensamble")).toBe("En Producción - Ensamble");
    });

    it("should return correct label for listo_instalacion", () => {
      expect(getStatusLabel("listo_instalacion")).toBe("Listo para Instalación");
    });

    it("should return correct label for entregado", () => {
      expect(getStatusLabel("entregado")).toBe("Entregado");
    });

    it("should return original value for unknown status", () => {
      expect(getStatusLabel("unknown")).toBe("unknown");
    });
  });

  describe("getWorkTypeLabel", () => {
    it("should return Cocina Integral for cocina", () => {
      expect(getWorkTypeLabel("cocina")).toBe("Cocina Integral");
    });

    it("should return Closet for closet", () => {
      expect(getWorkTypeLabel("closet")).toBe("Closet");
    });

    it("should return Puertas for puertas", () => {
      expect(getWorkTypeLabel("puertas")).toBe("Puertas");
    });

    it("should return Centro de TV for centro_tv", () => {
      expect(getWorkTypeLabel("centro_tv")).toBe("Centro de TV");
    });

    it("should return original value for unknown type", () => {
      expect(getWorkTypeLabel("otro")).toBe("otro");
    });
  });

  describe("prepareWhatsAppNotification", () => {
    it("should prepare complete notification data", () => {
      const project = {
        id: 1,
        name: "Cocina Moderna",
        status: "corte",
        workType: "cocina",
        client: {
          name: "Juan Pérez",
          whatsappPhone: "3136802025",
        },
      };

      const result = prepareWhatsAppNotification(project, "https://innovar.com");

      expect(result.message).toContain("Juan Pérez");
      expect(result.message).toContain("CORTE");
      expect(result.whatsappLink).toContain("wa.me");
      expect(result.whatsappLink).toContain("573136802025");
      expect(result.phone).toBe("3136802025");
      expect(result.statusLabel).toBe("En Producción - Corte");
    });

    it("should include portal URL in message", () => {
      const project = {
        id: 42,
        name: "Closet Principal",
        status: "pendiente_cliente",
        workType: "closet",
        client: {
          name: "María García",
          whatsappPhone: "3001234567",
        },
      };

      const result = prepareWhatsAppNotification(project, "https://app.innovar.co");

      expect(result.message).toContain("https://app.innovar.co/portal?project=42");
    });
  });
});
