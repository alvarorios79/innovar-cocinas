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
  generalNotes?: string; // Notas generales personalizadas
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

    // Limpiar nombre del cliente para usar en nombre de archivo
    // Permite tildes y caracteres especiales del español, pero elimina caracteres problemáticos
    const cleanClientName = data.clientName
      .replace(/[<>:"/\\|?*]/g, '') // Eliminar caracteres no permitidos en nombres de archivo
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .trim();
    
    // Formato: COT-2026-XXX_NombreCliente.pdf
    const filename = `${data.quotationNumber}_${cleanClientName}.pdf`;

    return {
      pdfPath: outputPath,
      filename,
    };
  } catch (error: any) {
    console.error("[PDF] Error al generar PDF:", error);
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}
