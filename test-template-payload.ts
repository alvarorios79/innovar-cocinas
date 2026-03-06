import { invokeLLM } from "./server/_core/llm";

// Test data
const testData = {
  phone: "573002826317",
  templateName: "cotizacion_pdf",
  language: "es_CO",
  documentUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663292328262/XhEkCr8yXcaeDFyuQebdJQ/test-quotations/COT-2026-001.pdf",
  fileName: "Cotizacion-COT-2026-001.pdf",
  clientName: "Test Client",
  quotationNumber: "COT-2026-001",
  quotationTotal: "$8.500.000"
};

async function testPayload() {
  console.log("\n===== TESTING TEMPLATE PAYLOAD =====\n");

  // Test 1: Verify PDF URL is accessible
  console.log("TEST 1: Verifying PDF URL accessibility");
  console.log("URL:", testData.documentUrl);
  
  try {
    const response = await fetch(testData.documentUrl, { method: "HEAD" });
    console.log("✓ PDF URL is accessible (Status: " + response.status + ")");
    console.log("✓ Content-Type:", response.headers.get("content-type"));
  } catch (error) {
    console.log("✗ PDF URL is NOT accessible:", error instanceof Error ? error.message : error);
  }

  // Test 2: Verify payload structure
  console.log("\nTEST 2: Verifying payload structure");
  
  const payload = {
    messaging_product: "whatsapp",
    to: testData.phone,
    type: "template",
    template: {
      name: testData.templateName,
      language: {
        code: testData.language,
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: testData.documentUrl,
                filename: testData.fileName,
              },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: testData.clientName },
            { type: "text", text: testData.quotationNumber },
            { type: "text", text: testData.quotationTotal },
          ],
        },
      ],
    },
  };

  console.log("Payload structure:");
  console.log(JSON.stringify(payload, null, 2));

  // Test 3: Verify body parameters count
  console.log("\nTEST 3: Verifying body parameters");
  const bodyParams = payload.template.components[1].parameters;
  console.log("Number of body parameters:", bodyParams.length);
  console.log("Parameters:");
  bodyParams.forEach((param, index) => {
    console.log(`  {{${index + 1}}} = ${param.text}`);
  });

  // Test 4: Verify header document
  console.log("\nTEST 4: Verifying header document");
  const headerParams = payload.template.components[0].parameters;
  console.log("Header parameter type:", headerParams[0].type);
  console.log("Document link:", headerParams[0].document.link);
  console.log("Document filename:", headerParams[0].document.filename);

  console.log("\n===== PAYLOAD VERIFICATION COMPLETE =====\n");
}

testPayload().catch(console.error);
