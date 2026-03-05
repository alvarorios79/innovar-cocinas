/**
 * Test script for sendTemplateWithDocument function
 * Tests sending a quotation with PDF in template header (single message)
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

async function runTest() {
  try {
    console.log("\n===== WHATSAPP TEMPLATE WITH DOCUMENT TEST START =====\n");

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

    // Send template with document in header (SINGLE MESSAGE)
    console.log("----- WHATSAPP TEMPLATE WITH DOCUMENT SEND -----");
    const result = await whatsappCloud.sendTemplateWithDocument(
      TEST_PHONE,
      TEST_TEMPLATE,
      TEST_LANGUAGE,
      s3Result.url,
      "COT-2026-001.pdf",
      TEST_CLIENT_NAME,
      TEST_QUOTATION_NUMBER,
      TEST_QUOTATION_TOTAL
    );

    console.log("Result:", result);

    console.log("\n===== WHATSAPP TEMPLATE WITH DOCUMENT TEST END =====\n");
  } catch (error) {
    console.error("\nWHATSAPP ERROR:");
    console.error(JSON.stringify(error, null, 2));
  }

  process.exit(0);
}

runTest();
