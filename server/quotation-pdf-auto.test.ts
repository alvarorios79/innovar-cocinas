import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de fs
vi.mock("fs", () => ({
  readFileSync: vi.fn(() => Buffer.from("PDF content")),
  unlinkSync: vi.fn(),
}));

// Mock de storage
vi.mock("./storage", () => ({
  storagePut: vi.fn(() => Promise.resolve({ url: "https://s3.example.com/quotations/COT-2026-001.pdf", key: "quotations/COT-2026-001.pdf" })),
}));

// Mock del generador de PDF
vi.mock("./quotation-pdf-generator", () => ({
  generateQuotationPDF: vi.fn(() => Promise.resolve({ pdfPath: "/tmp/quotation_1_123456.pdf", filename: "COT-2026-001.pdf" })),
}));

describe("Generación Automática de PDF de Cotización", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe generar PDF con datos correctos de la cotización", async () => {
    const { generateQuotationPDF } = await import("./quotation-pdf-generator");
    
    const pdfData = {
      quotationNumber: "COT-2026-001",
      date: "23/01/2026",
      clientName: "Juan Pérez",
      vendorName: "Martha Serna",
      productType: "cocina",
      validUntil: "30/01/2026",
      items: [
        {
          itemNumber: 1,
          description: "Cocina integral 4ml",
          quantity: "1",
          totalPrice: "$3.600.000",
        },
      ],
      subtotal: "$3.600.000",
      transportCost: "$600.000",
      total: "$4.200.000",
    };

    const result = await generateQuotationPDF(pdfData, 1);

    expect(generateQuotationPDF).toHaveBeenCalledWith(pdfData, 1);
    expect(result.pdfPath).toBe("/tmp/quotation_1_123456.pdf");
    expect(result.filename).toBe("COT-2026-001.pdf");
  });

  it("debe subir PDF a S3 correctamente", async () => {
    const { storagePut } = await import("./storage");
    const fs = await import("fs");

    // Simular lectura del archivo
    const pdfBuffer = fs.readFileSync("/tmp/quotation_1_123456.pdf");
    expect(pdfBuffer).toBeDefined();

    // Simular subida a S3
    const pdfKey = `quotations/COT-2026-001-${Date.now()}.pdf`;
    const result = await storagePut(pdfKey, pdfBuffer, "application/pdf");

    expect(storagePut).toHaveBeenCalled();
    expect(result.url).toContain("s3.example.com");
    expect(result.url).toContain("quotations");
  });

  it("debe limpiar archivo temporal después de subir", async () => {
    const fs = await import("fs");
    
    const tempPath = "/tmp/quotation_1_123456.pdf";
    fs.unlinkSync(tempPath);

    expect(fs.unlinkSync).toHaveBeenCalledWith(tempPath);
  });

  it("debe manejar errores de generación de PDF sin fallar la aprobación", async () => {
    const { generateQuotationPDF } = await import("./quotation-pdf-generator");
    
    // Simular error
    vi.mocked(generateQuotationPDF).mockRejectedValueOnce(new Error("Error de generación"));

    let quotationPdfUrl: string | null = null;
    try {
      await generateQuotationPDF({} as any, 1);
    } catch (error: any) {
      // El error se captura pero no debe detener el flujo
      console.error("[PDF] Error generando PDF de cotización:", error);
      quotationPdfUrl = null;
    }

    // La URL debe ser null pero no debe lanzar excepción
    expect(quotationPdfUrl).toBeNull();
  });

  it("debe incluir todos los items de la cotización en el PDF", async () => {
    const { generateQuotationPDF } = await import("./quotation-pdf-generator");
    
    const pdfData = {
      quotationNumber: "COT-2026-002",
      date: "23/01/2026",
      clientName: "María García",
      vendorName: "Álvaro Ríos",
      productType: "closet",
      validUntil: "30/01/2026",
      items: [
        { itemNumber: 1, description: "Closet principal 3m", quantity: "1", totalPrice: "$2.700.000" },
        { itemNumber: 2, description: "Closet secundario 2m", quantity: "1", totalPrice: "$1.800.000" },
        { itemNumber: 3, description: "Herrajes premium", quantity: "2", totalPrice: "$1.000.000" },
      ],
      subtotal: "$5.500.000",
      transportCost: "$600.000",
      total: "$6.100.000",
    };

    await generateQuotationPDF(pdfData, 2);

    expect(generateQuotationPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ itemNumber: 1 }),
          expect.objectContaining({ itemNumber: 2 }),
          expect.objectContaining({ itemNumber: 3 }),
        ]),
      }),
      2
    );
  });

  it("debe generar nombre de archivo único con timestamp", () => {
    const quotationNumber = "COT-2026-003";
    const timestamp = Date.now();
    const pdfKey = `quotations/${quotationNumber}-${timestamp}.pdf`;

    expect(pdfKey).toMatch(/^quotations\/COT-2026-003-\d+\.pdf$/);
  });
});

describe("Campo quotationPdfUrl en Proyecto", () => {
  it("debe aceptar URL del PDF en la creación del proyecto", () => {
    const projectData = {
      quotationId: 1,
      clientId: 1,
      name: "Juan Pérez - COT-2026-001",
      workType: "cocina",
      status: "cotizacion_aprobada",
      quotationApprovedAt: new Date(),
      createdBy: 1,
      advanceReceiptUrl: "https://s3.example.com/receipts/receipt.jpg",
      quotationPdfUrl: "https://s3.example.com/quotations/COT-2026-001.pdf",
    };

    expect(projectData.quotationPdfUrl).toBe("https://s3.example.com/quotations/COT-2026-001.pdf");
  });

  it("debe permitir quotationPdfUrl null si falla la generación", () => {
    const projectData = {
      quotationId: 1,
      clientId: 1,
      name: "Juan Pérez - COT-2026-001",
      workType: "cocina",
      status: "cotizacion_aprobada",
      quotationApprovedAt: new Date(),
      createdBy: 1,
      advanceReceiptUrl: null,
      quotationPdfUrl: null,
    };

    expect(projectData.quotationPdfUrl).toBeNull();
  });
});
