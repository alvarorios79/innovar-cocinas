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
  discountPercent?: string; // Porcentaje de descuento
  discountAmount?: string; // Monto del descuento
  total: string;
  generalNotes?: string; // Notas generales personalizadas
  version?: number; // Versión del PDF
}

export async function generateQuotationPDF(
  data: QuotationPDFData,
  quotationId: number,
  version?: number
): Promise<{ pdfPath: string; filename: string; pdfKey: string }> {
  const outputPath = `/tmp/quotation_${quotationId}_${Date.now()}.pdf`;

  try {
    // Generar PDF usando PDFKit
    await generatePDF(data, outputPath);

    // Limpiar nombre del cliente para usar en nombre de archivo
    // Permite tildes y caracteres especiales del español, pero elimina caracteres problemáticos
    const cleanClientName = data.clientName
      .replace(/[<>:"/\\|?*]/g, '') // Eliminar caracteres no permitidos en nombres de archivo
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .trim();
    
    // Formato: COT-2026-XXX_NombreCliente.pdf
    const filename = `${data.quotationNumber}_${cleanClientName}.pdf`;
    
    // Generar pdfKey con versionado: quotations/COT-2026-XXX/v1.pdf
    const versionNumber = version || 1;
    const pdfKey = `quotations/${data.quotationNumber}/v${versionNumber}.pdf`;

    return {
      pdfPath: outputPath,
      filename,
      pdfKey,
    };
  } catch (error: any) {
    console.error("[PDF] Error al generar PDF:", error);
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}
