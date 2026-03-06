// Create cotizacion_pdf_v2 template in Meta Business Manager

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "920948637152314";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

async function createTemplate() {
  console.log("\n===== CREATING WHATSAPP TEMPLATE: cotizacion_pdf_v2 =====\n");

  const payload = {
    name: "cotizacion_pdf_v2",
    language: "es",
    category: "UTILITY",
    components: [
      {
        type: "HEADER",
        format: "DOCUMENT",
      },
      {
        type: "BODY",
        text: "Hola {{1}}\n\nTu cotización {{2}} ya está lista.\n\nValor total {{3}}\n\nAdjunto encontrarás el documento completo con todos los detalles del proyecto.",
        example: {
          body_text: [["Carlos", "COT-001", "$8.500.000"]],
        },
      },
    ],
  };

  console.log("Template Configuration:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("\nWABA ID:", WABA_ID);
  console.log("Endpoint: https://graph.facebook.com/v19.0/" + WABA_ID + "/message_templates");

  if (!ACCESS_TOKEN) {
    console.log("\n✗ ERROR: WHATSAPP_ACCESS_TOKEN not set");
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${WABA_ID}/message_templates`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log("\n----- RESPONSE FROM META API -----");
    console.log("STATUS:", response.status);
    console.log("RESPONSE:", JSON.stringify(data, null, 2));

    if (response.ok && data.id) {
      console.log("\n✓ SUCCESS - Template created");
      console.log("Template ID:", data.id);
      console.log("Status: PENDING (awaiting approval)");
    } else {
      console.log("\n✗ FAILED");
      if (data.error) {
        console.log("Error Code:", data.error.code);
        console.log("Error Message:", data.error.message);
        if (data.error.error_data) {
          console.log("Error Details:", JSON.stringify(data.error.error_data, null, 2));
        }
      }
    }
  } catch (error) {
    console.log("\n✗ FETCH ERROR:", error instanceof Error ? error.message : error);
  }

  console.log("\n===== END =====\n");
}

createTemplate().catch(console.error);
