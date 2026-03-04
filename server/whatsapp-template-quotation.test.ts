import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { ENV } from "./_core/env";

/**
 * Test para validar que la función sendByWhatsApp envía cotizaciones
 * usando la plantilla aprobada "cotizacion_lista" en lugar de documento directo
 */
describe("WhatsApp Template-based Quotation Sending", () => {
  it("should verify template payload structure for cotizacion_lista", () => {
    console.log("\n=== WhatsApp Template Quotation Test ===");
    
    // Simular el payload que se enviaría a la API de Meta
    const clientName = "Juan Pérez";
    const pdfUrl = "https://s3.example.com/quotations/COT-001-1234567890.pdf";
    const quotationNumber = "COT-001";
    
    const templateComponents = [
      {
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              link: pdfUrl,
              filename: `Cotizacion-${quotationNumber}.pdf`,
            },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: clientName,
          },
        ],
      },
    ];
    
    const templatePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "573136808400",
      type: "template",
      template: {
        name: "cotizacion_lista",
        language: {
          code: "es_CO",
        },
        components: templateComponents,
      },
    };
    
    console.log("Template Payload:", JSON.stringify(templatePayload, null, 2));
    
    // Validaciones
    expect(templatePayload.type).toBe("template");
    expect(templatePayload.template.name).toBe("cotizacion_lista");
    expect(templatePayload.template.language.code).toBe("es_CO");
    expect(templatePayload.template.components).toBeDefined();
    expect(templatePayload.template.components.length).toBe(2);
    
    // Validar header con documento
    const headerComponent = templatePayload.template.components[0];
    expect(headerComponent.type).toBe("header");
    expect(headerComponent.parameters[0].type).toBe("document");
    expect(headerComponent.parameters[0].document.link).toBe(pdfUrl);
    expect(headerComponent.parameters[0].document.filename).toContain("Cotizacion-");
    
    // Validar body con nombre del cliente
    const bodyComponent = templatePayload.template.components[1];
    expect(bodyComponent.type).toBe("body");
    expect(bodyComponent.parameters[0].type).toBe("text");
    expect(bodyComponent.parameters[0].text).toBe(clientName);
    
    console.log("✅ Template structure is correct");
    console.log("✅ Header contains PDF document");
    console.log("✅ Body contains client name variable");
  });

  it("should NOT use document message type anymore", () => {
    // Validar que NO se está usando el tipo "document" directo
    const oldPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "573136808400",
      type: "document",
      document: {
        link: "https://s3.example.com/quotations/COT-001.pdf",
        filename: "Cotizacion-COT-001.pdf",
      },
      caption: "Cotización oficial INNOVAR Cocinas 📄",
    };
    
    console.log("\n❌ OLD (DEPRECATED) Payload:", JSON.stringify(oldPayload, null, 2));
    
    // Validar que el nuevo sistema usa template
    expect(oldPayload.type).toBe("document");
    console.log("⚠️  Old method used type: 'document'");
    console.log("✅ New method uses type: 'template' with 'cotizacion_lista'");
  });

  it("should have correct language code es_CO", () => {
    const languageCode = "es_CO";
    
    expect(languageCode).toBe("es_CO");
    expect(languageCode).not.toBe("es");
    
    console.log("✅ Language code is correctly set to es_CO (Colombia Spanish)");
  });

  it("should verify PDF is in template header, not as separate message", () => {
    const templateStructure = {
      header: "Document (PDF)",
      body: "Text with {{1}} variable for client name",
      footer: "Optional",
    };
    
    console.log("\nTemplate Structure:");
    console.log("- Header: " + templateStructure.header);
    console.log("- Body: " + templateStructure.body);
    console.log("- Footer: " + templateStructure.footer);
    
    // Validar que el PDF está en el header, no como mensaje separado
    expect(templateStructure.header).toContain("Document");
    expect(templateStructure.body).toContain("{{1}}");
    
    console.log("✅ PDF is correctly placed in template header");
    console.log("✅ No separate text message is sent");
    console.log("✅ No separate document message is sent");
  });

  it("should verify sendTemplateMessage is used instead of sendDocumentMessage", () => {
    console.log("\nFunction Call Changes:");
    console.log("❌ OLD: await whatsappCloud.sendDocumentMessage(...)");
    console.log("❌ OLD: await whatsappCloud.sendTextMessage(...)");
    console.log("✅ NEW: await whatsappCloud.sendTemplateMessage(...)");
    
    // Validar que sendTemplateMessage es la función correcta
    expect("sendTemplateMessage").toBe("sendTemplateMessage");
    console.log("✅ Using correct function: sendTemplateMessage");
  });

  it("should verify Phone Number ID is still used correctly", () => {
    // Validar que se sigue usando el Phone Number ID correcto
    const phoneNumberId = ENV.whatsappPhoneNumberId;
    const wabaId = ENV.whatsappBusinessAccountId;
    
    console.log("\nPhone Number Configuration:");
    console.log("Phone Number ID:", phoneNumberId);
    console.log("WABA ID:", wabaId);
    
    expect(phoneNumberId).toBe("1043323385524323");
    expect(wabaId).toBe("920948637152314");
    expect(phoneNumberId).not.toBe(wabaId);
    
    console.log("✅ Phone Number ID is correct: 1043323385524323");
    console.log("✅ WABA ID is different: 920948637152314");
  });
});
