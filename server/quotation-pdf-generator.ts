import { generateQuotationPDF as generatePDF } from "./pdf-generator-pdfkit";

interface QuotationPDFData {
  quotationNumber: string;
  date: string;
  clientName: string;
  vendorName: string;
  productType: string;
  validUntil: string;
  items: Array<{
    itemNumber: number;
    description: string;
    quantity: string;
    unitPrice?: string;
    totalPrice: string;
  }>;
  subtotal: string;
  transportCost: string;
  total: string;
}

export async function generateQuotationPDF(
  data: QuotationPDFData,
  quotationId: number
): Promise<{ pdfPath: string; filename: string }> {
  const outputPath = `/tmp/quotation_${quotationId}_${Date.now()}.pdf`;

  try {
    // Generar PDF usando PDFKit
    await generatePDF(data, outputPath);
    console.log(`[PDF] Archivo generado: ${outputPath}`);

    return {
      pdfPath: outputPath,
      filename: `${data.quotationNumber}.pdf`,
    };
  } catch (error: any) {
    console.error("[PDF] Error al generar PDF:", error);
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}
