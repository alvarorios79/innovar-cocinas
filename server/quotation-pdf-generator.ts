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

export async function generateQuotationPDF(data: QuotationPDFData, quotationId: number): Promise<{ pdfPath: string; filename: string }> {
  const outputPath = `/tmp/quotation_${quotationId}_${Date.now()}.pdf`;
  const jsonData = JSON.stringify(data).replace(/'/g, "'\\''" );

  try {
    await execAsync(`/usr/bin/python3 /home/ubuntu/innovar_cocinas/server/generate_quotation_pdf.py '${jsonData}' ${outputPath}`);

    // Verificar que el archivo se creó
    const pdfBuffer = readFileSync(outputPath);
    console.log(`[PDF] Archivo generado: ${outputPath}, tamaño: ${pdfBuffer.length} bytes`);

    return {
      pdfPath: outputPath,
      filename: `${data.quotationNumber}.pdf`,
    };
  } catch (error: any) {
    console.error('Error generando PDF:', error);
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}
