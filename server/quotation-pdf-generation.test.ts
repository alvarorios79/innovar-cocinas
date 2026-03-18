import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateQuotationPDF } from "./quotation-pdf-generator";
import { existsSync, unlinkSync } from "fs";
import path from "path";

describe("Quotation PDF Generation", () => {
  let testPdfPath: string;

  beforeAll(() => {
    testPdfPath = `/tmp/test_quotation_${Date.now()}.pdf`;
  });

  afterAll(() => {
    // Limpiar archivo de prueba
    if (existsSync(testPdfPath)) {
      unlinkSync(testPdfPath);
    }
  });

  it("should generate PDF with items successfully", async () => {
    const pdfData = {
      quotationNumber: "COT-2026-TEST-001",
      date: "18/03/2026",
      clientName: "Cliente Prueba",
      clientPhone: "3002826317",
      clientAddress: "Calle 123, Pereira",
      vendorName: "INNOVAR Cocinas",
      productType: "cocina",
      validUntil: "25/03/2026",
      items: [
        {
          itemNumber: 1,
          description: "Cocina Integral - Metraje Lineal",
          quantity: "3.5",
          unitPrice: "750000",
          totalPrice: "2625000",
        },
        {
          itemNumber: 2,
          description: "Transporte e Instalación",
          quantity: "1",
          unitPrice: "200000",
          totalPrice: "200000",
        },
      ],
      subtotal: "2825000",
      transportCost: "0",
      discountPercent: "10",
      discountAmount: "282500",
      total: "2542500",
    };

    const { pdfPath, filename, pdfKey } = await generateQuotationPDF(
      pdfData,
      1001,
      1
    );

    // Verificar que el archivo se creó
    expect(existsSync(pdfPath)).toBe(true);

    // Verificar que el nombre del archivo es correcto
    expect(filename).toContain("COT-2026-TEST-001");
    expect(filename).toContain("Cliente_Prueba");

    // Verificar que la clave del PDF es correcta
    expect(pdfKey).toBe("quotations/COT-2026-TEST-001/v1.pdf");

    // Verificar que el archivo tiene contenido
    const fs = await import("fs");
    const stats = fs.statSync(pdfPath);
    expect(stats.size).toBeGreaterThan(0);

    // Limpiar
    if (existsSync(pdfPath)) {
      unlinkSync(pdfPath);
    }
  });

  it("should generate PDF with empty items array", async () => {
    const pdfData = {
      quotationNumber: "COT-2026-TEST-002",
      date: "18/03/2026",
      clientName: "Cliente Vacío",
      clientPhone: "3002826317",
      clientAddress: "Calle 456, Pereira",
      vendorName: "INNOVAR Cocinas",
      productType: "closet",
      validUntil: "25/03/2026",
      items: [],
      subtotal: "0",
      transportCost: "0",
      total: "0",
    };

    const { pdfPath, filename } = await generateQuotationPDF(
      pdfData,
      1002,
      1
    );

    // Verificar que el archivo se creó incluso sin items
    expect(existsSync(pdfPath)).toBe(true);
    expect(filename).toContain("COT-2026-TEST-002");

    // Limpiar
    if (existsSync(pdfPath)) {
      unlinkSync(pdfPath);
    }
  });

  it("should handle special characters in client name", async () => {
    const pdfData = {
      quotationNumber: "COT-2026-TEST-003",
      date: "18/03/2026",
      clientName: "José María García López",
      clientPhone: "3002826317",
      clientAddress: "Calle 789, Pereira",
      vendorName: "INNOVAR Cocinas",
      productType: "puerta",
      validUntil: "25/03/2026",
      items: [
        {
          itemNumber: 1,
          description: "Puerta Corrediza",
          quantity: "2",
          unitPrice: "500000",
          totalPrice: "1000000",
        },
      ],
      subtotal: "1000000",
      transportCost: "0",
      total: "1000000",
    };

    const { pdfPath, filename } = await generateQuotationPDF(
      pdfData,
      1003,
      1
    );

    // Verificar que el archivo se creó
    expect(existsSync(pdfPath)).toBe(true);

    // Verificar que los caracteres especiales se manejaron correctamente
    expect(filename).not.toContain("<");
    expect(filename).not.toContain(">");
    expect(filename).not.toContain(":");

    // Limpiar
    if (existsSync(pdfPath)) {
      unlinkSync(pdfPath);
    }
  });
});
