// Test alternative parameter formats

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "1043323385524323";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

async function testAlternativeFormat() {
  console.log("\n===== TESTING ALTERNATIVE PARAMETER FORMAT =====\n");

  // Try with parameters as objects with name and value
  const payload = {
    messaging_product: "whatsapp",
    to: "573002826317",
    type: "template",
    template: {
      name: "cotizacion_pdf",
      language: {
        code: "es_CO",
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: "https://d2xsxph8kpxj0f.cloudfront.net/310519663292328262/XhEkCr8yXcaeDFyuQebdJQ/test-quotations/COT-2026-001.pdf",
                filename: "Cotizacion-COT-2026-001.pdf",
              },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: "Carlos García" },
            { type: "text", text: "COT-2026-001" },
            { type: "text", text: "$8.500.000" },
          ],
        },
      ],
    },
  };

  console.log("PAYLOAD:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("\nENDPOINT:", `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`);

  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log("\n✗ ERROR: WHATSAPP_ACCESS_TOKEN not set");
    return;
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log("\n----- RESPONSE -----");
    console.log("STATUS:", response.status);
    console.log("RESPONSE:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✓ SUCCESS");
    } else {
      console.log("\n✗ FAILED");
      if (data.error) {
        console.log("\nERROR ANALYSIS:");
        console.log("Code:", data.error.code);
        console.log("Message:", data.error.message);
        if (data.error.error_data) {
          console.log("Details:", data.error.error_data.details);
        }
      }
    }
  } catch (error) {
    console.log("\n✗ FETCH ERROR:", error instanceof Error ? error.message : error);
  }

  console.log("\n===== END TEST =====\n");
}

testAlternativeFormat().catch(console.error);
