// Using native fetch (Node 18+)

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "1043323385524323";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

async function sendTemplateWithDocument() {
  console.log("\n===== SENDING TEMPLATE WITH DOCUMENT =====\n");

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

  console.log("REQUEST PAYLOAD:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("\nENDPOINT:", `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`);
  console.log("TOKEN:", WHATSAPP_ACCESS_TOKEN ? "✓ Present" : "✗ Missing");

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

    console.log("\n----- RESPONSE FROM META API -----");
    console.log("STATUS:", response.status);
    console.log("RESPONSE:", JSON.stringify(data, null, 2));

    if (response.ok && data.messages && data.messages.length > 0) {
      console.log("\n✓ SUCCESS");
      console.log("MESSAGE_ID:", data.messages[0].id);
    } else {
      console.log("\n✗ FAILED");
      if (data.error) {
        console.log("ERROR CODE:", data.error.code);
        console.log("ERROR MESSAGE:", data.error.message);
        if (data.error.error_data) {
          console.log("ERROR DATA:", JSON.stringify(data.error.error_data, null, 2));
        }
      }
    }
  } catch (error) {
    console.log("\n✗ FETCH ERROR:", error instanceof Error ? error.message : error);
  }

  console.log("\n===== END TEST =====\n");
}

sendTemplateWithDocument().catch(console.error);
