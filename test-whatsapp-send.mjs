#!/usr/bin/env node
/**
 * Test script for WhatsApp quotation sending
 * Simulates the complete flow of sending a quotation via WhatsApp
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_PHONE = '573002826317';
const TEST_TEMPLATE = 'cotizacion_lista';
const TEST_LANGUAGE = 'es';

console.log('\n===== WHATSAPP TEST START =====\n');

// Create a simple test PDF
const testPdfPath = '/tmp/test-cotizacion.pdf';
const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n trailer<</Size 4/Root 1 0 R>>startxref 190 %%EOF');
fs.writeFileSync(testPdfPath, pdfContent);

console.log('Test PDF created at:', testPdfPath);
console.log('PDF file size:', fs.statSync(testPdfPath).size, 'bytes\n');

// Now run the server and trigger the test
console.log('Starting server test...\n');

// Create a test client in database and trigger sendByWhatsApp
const testScript = `
import { db } from './server/db.ts';
import * as whatsappCloud from './server/whatsapp-cloud.ts';
import { storagePut } from './server/storage.ts';
import fs from 'fs';

async function runTest() {
  try {
    console.log('\\n===== WHATSAPP TEST START =====\\n');
    
    // Simulate PDF upload to S3
    const pdfBuffer = fs.readFileSync('/tmp/test-cotizacion.pdf');
    const s3Result = await storagePut('test-quotations/COT-2026-001.pdf', pdfBuffer, 'application/pdf');
    
    console.log('PDF uploaded to S3:', s3Result.url);
    
    // Send template
    console.log('\\n----- WHATSAPP TEMPLATE SEND -----');
    const templateResult = await whatsappCloud.sendTemplateMessage(
      '${TEST_PHONE}',
      '${TEST_TEMPLATE}',
      '${TEST_LANGUAGE}',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Test Client' }
          ]
        }
      ]
    );
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send document
    console.log('\\n----- WHATSAPP DOCUMENT SEND -----');
    const docResult = await whatsappCloud.sendDocumentMessage(
      '${TEST_PHONE}',
      s3Result.url,
      'COT-2026-001.pdf',
      'Cotización oficial INNOVAR Cocinas 📄'
    );
    
    console.log('\\n===== WHATSAPP TEST END =====\\n');
    
  } catch (error) {
    console.error('WHATSAPP ERROR:', JSON.stringify(error, null, 2));
  }
  
  process.exit(0);
}

runTest();
`;

fs.writeFileSync('/tmp/test-whatsapp.ts', testScript);

// Execute the test using tsx
const child = spawn('tsx', ['/tmp/test-whatsapp.ts'], {
  cwd: '/home/ubuntu/innovar_cocinas',
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

child.on('close', (code) => {
  console.log('\nTest completed with code:', code);
  process.exit(code);
});
