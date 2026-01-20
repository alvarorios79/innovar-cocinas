import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, unlinkSync } from 'fs';

const execAsync = promisify(exec);

interface QuotationPDFData {
  quotationNumber: string;
  date: string;
  clientName: string;
  vendorName: string;
  workType: string;
  validUntil: string;
  items: Array<{
    itemNumber: number;
    description: string;
    quantity: string;
    unitPrice?: string;
    totalPrice: string;
  }>;
  subtotal: string;
  fixedCosts: string;
  total: string;
}

export async function generateQuotationPDF(data: QuotationPDFData, quotationId: number): Promise<{ pdfBase64: string; filename: string }> {
  const outputPath = `/tmp/quotation_${quotationId}_${Date.now()}.pdf`;
  const jsonData = JSON.stringify(data).replace(/'/g, "'\\''");

  try {
    await execAsync(`python3 /home/ubuntu/innovar_cocinas/server/generate_quotation_pdf.py '${jsonData}' ${outputPath}`);

    // Leer el PDF generado
    const pdfBuffer = readFileSync(outputPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Limpiar archivo temporal
    unlinkSync(outputPath);

    return {
      pdfBase64,
      filename: `${data.quotationNumber}.pdf`,
    };
  } catch (error: any) {
    console.error('Error generando PDF:', error);
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}
