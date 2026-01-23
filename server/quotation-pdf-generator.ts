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

// Función para limpiar el nombre del archivo
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_\sáéíóúÁÉÍÓÚñÑ]/g, '') // Permitir letras, números, guiones, espacios y tildes
    .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
    .substring(0, 100); // Limitar longitud
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

    // Generar nombre de archivo con código y nombre del cliente
    const cleanClientName = sanitizeFilename(data.clientName);
    const filename = `${data.quotationNumber}_${cleanClientName}.pdf`;

    return {
      pdfPath: outputPath,
      filename: filename,
    };
  } catch (error: any) {
    console.error("[PDF] Error al generar PDF:", error);
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}
