/**
 * Test script for WhatsApp quotation sending
 * Simulates the complete flow of sending a quotation via WhatsApp
 */

import * as whatsappCloud from "./server/whatsapp-cloud";
import { storagePut } from "./server/storage";
import fs from "fs";

const TEST_PHONE = "573002826317";
const TEST_TEMPLATE = "cotizacion_lista";
const TEST_LANGUAGE = "es";
const TEST_CLIENT_NAME = "Test Client";
const TEST_QUOTATION_NUMBER = "COT/2026-001";
const TEST_QUOTATION_TOTAL = "5.500.000";
const INNOVAR_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663292328262/XhEkCr8yXcaeDFyuQebdJQ/branding/innovar-logo-transparent-jt9je6rz.png";

async function runTest() {
  try {
    console.log("\n===== WHATSAPP TEST START =====\n");

    // Create a simple test PDF
    const testPdfPath = "/tmp/test-cotizacion.pdf";
    const pdfContent = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n trailer<</Size 4/Root 1 0 R>>startxref 190 %%EOF"
    );
    fs.writeFileSync(testPdfPath, pdfContent);

    console.log("Test PDF created at:", testPdfPath);
    console.log("PDF file size:", fs.statSync(testPdfPath).size, "bytes\n");

    // Simulate PDF upload to S3
    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log("Uploading PDF to S3...");
    const s3Result = await storagePut(
      "test-quotations/COT-2026-001.pdf",
      pdfBuffer,
      "application/pdf"
    );

    console.log("PDF uploaded to S3:", s3Result.url, "\n");

    // Send template with image header and all 3 body parameters
    console.log("----- WHATSAPP TEMPLATE SEND -----");
    const templateResult = await whatsappCloud.sendTemplateMessage(
      TEST_PHONE,
      TEST_TEMPLATE,
      TEST_LANGUAGE,
      [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: INNOVAR_LOGO_URL,
              },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: TEST_CLIENT_NAME },
            { type: "text", text: TEST_QUOTATION_NUMBER },
            { type: "text", text: TEST_QUOTATION_TOTAL },
          ],
        },
      ]
    );

    console.log("Template result:", templateResult);

    // Wait 1 second
    console.log("\nWaiting 1 second...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Send document
    console.log("\n----- WHATSAPP DOCUMENT SEND -----");
    const docResult = await whatsappCloud.sendDocumentMessage(
      TEST_PHONE,
      s3Result.url,
      "COT-2026-001.pdf",
      "Cotización oficial INNOVAR Cocinas 📄"
    );

    console.log("Document result:", docResult);

    console.log("\n===== WHATSAPP TEST END =====\n");
  } catch (error) {
    console.error("\nWHATSAPP ERROR:");
    console.error(JSON.stringify(error, null, 2));
  }

  process.exit(0);
}

runTest();
