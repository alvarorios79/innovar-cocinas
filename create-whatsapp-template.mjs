/**
 * Script to create a new WhatsApp template: cotizacion_pdf
 * Template with DOCUMENT header for sending quotations with PDF
 */

const WHATSAPP_API_VERSION = "v21.0";
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

if (!WHATSAPP_BUSINESS_ACCOUNT_ID || !WHATSAPP_ACCESS_TOKEN) {
  console.error("ERROR: Missing WHATSAPP_BUSINESS_ACCOUNT_ID or WHATSAPP_ACCESS_TOKEN");
  process.exit(1);
}

const templatePayload = {
  name: "cotizacion_pdf",
  language: "es",
  category: "UTILITY",
  components: [
    {
      type: "HEADER",
      format: "DOCUMENT",
      example: {
        header_document: {
          link: "https://example.com/cotizacion.pdf",
          filename: "cotizacion.pdf"
        }
      }
    },
    {
      type: "BODY",
      text: "Hola {{1}} 👋\n\nTu cotización {{2}} ya está lista.\n\nValor total: {{3}}\n\nAdjunto encontrarás el documento completo con todos los detalles del proyecto.\n\nSi tienes alguna duda estaremos atentos.\n\nINNOVAR Cocinas de Diseño",
      example: {
        body_text: [
          [
            "Carlos",
            "COT-001",
            "$5.800.000"
          ]
        ]
      }
    },
    {
      type: "FOOTER",
      text: "Innovar Cocinas de Diseño"
    }
  ]
};

async function createTemplate() {
  try {
    console.log("\n===== CREATING WHATSAPP TEMPLATE: cotizacion_pdf =====\n");
    
    console.log("WABA ID:", WHATSAPP_BUSINESS_ACCOUNT_ID);
    console.log("Template Name:", templatePayload.name);
    console.log("Language:", templatePayload.language);
    console.log("Category:", templatePayload.category);
    console.log("\nTemplate Payload:");
    console.log(JSON.stringify(templatePayload, null, 2));
    
    const endpoint = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;
    
    console.log("\nEndpoint:", endpoint);
    console.log("\nSending request to Meta API...\n");
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(templatePayload)
    });
    
    const data = await response.json();
    
    console.log("===== RESPONSE FROM META API =====");
    console.log("Status:", response.status);
    console.log("Response:");
    console.log(JSON.stringify(data, null, 2));
    console.log("=====================================\n");
    
    if (response.ok) {
      console.log("✓ Template created successfully!");
      console.log("Template ID:", data.id);
      
      // Verify template status
      console.log("\nVerifying template status...\n");
      await verifyTemplateStatus(data.id);
    } else {
      console.error("✗ Error creating template:");
      console.error("Error Code:", data.error?.code);
      console.error("Error Message:", data.error?.message);
      console.error("Error Details:", data.error?.error_user_msg);
    }
    
  } catch (error) {
    console.error("ERROR:", error.message);
  }
  
  process.exit(0);
}

async function verifyTemplateStatus(templateId) {
  try {
    const endpoint = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    
    const data = await response.json();
    
    console.log("===== LIST OF ALL TEMPLATES =====");
    console.log(JSON.stringify(data, null, 2));
    console.log("==================================\n");
    
    // Find cotizacion_pdf template
    const cotizacionTemplate = data.data?.find(t => t.name === "cotizacion_pdf");
    
    if (cotizacionTemplate) {
      console.log("✓ Template 'cotizacion_pdf' found!");
      console.log("Name:", cotizacionTemplate.name);
      console.log("Status:", cotizacionTemplate.status);
      console.log("Language:", cotizacionTemplate.language);
      console.log("Category:", cotizacionTemplate.category);
      console.log("ID:", cotizacionTemplate.id);
    } else {
      console.log("✗ Template 'cotizacion_pdf' not found in list");
    }
    
  } catch (error) {
    console.error("ERROR verifying template:", error.message);
  }
}

createTemplate();
