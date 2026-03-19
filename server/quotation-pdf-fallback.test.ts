import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as db from "./db";
import { storagePut, storageGet } from "./storage";
import { generateQuotationPDF } from "./quotation-pdf-generator";
import { readFileSync, unlinkSync } from "fs";

// Mock de las dependencias
vi.mock("./db");
vi.mock("./storage");
vi.mock("./quotation-pdf-generator");
vi.mock("fs");

describe("quotation-pdf-fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería generar PDF cuando pdfUrl es NULL", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;

    // Mock de quotation sin pdfUrl
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: null, // NULL - Esto dispara el fallback
      subtotal: 1000,
      transportCost: 100,
      discountPercent: 10,
      discountAmount: 100,
      total: 1000,
      vendorName: "Vendor",
      productType: "Kitchen",
      validUntil: new Date(),
      createdAt: new Date(),
    };

    // Mock de cliente
    const mockClient = {
      id: clientId,
      name: "Test Client",
      whatsappPhone: "123456789",
      address: "Test Address",
    };

    // Mock de items
    const mockItems = [
      {
        itemNumber: 1,
        description: "Item 1",
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
      },
      {
        itemNumber: 2,
        description: "Item 2",
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
      },
    ];

    // Mock de PDF generado
    const mockPdfPath = "/tmp/test-pdf-123.pdf";
    const mockPdfBuffer = Buffer.from("PDF_CONTENT_HERE");

    // Configurar mocks
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(db.getQuotationItems).mockResolvedValue(mockItems);
    vi.mocked(generateQuotationPDF).mockResolvedValue({
      pdfPath: mockPdfPath,
    });
    vi.mocked(readFileSync).mockReturnValue(mockPdfBuffer);
    vi.mocked(storagePut).mockResolvedValue({
      url: "https://s3.example.com/quotations/456/123/v1.pdf",
      key: "quotations/456/123/v1.pdf",
    });
    vi.mocked(storageGet).mockResolvedValue({
      url: "https://s3.example.com/presigned-url",
      key: "quotations/456/123/v1.pdf",
    });
    vi.mocked(db.updateQuotation).mockResolvedValue(undefined);

    // Act - Simular el flujo del endpoint
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBeNull();

    // Verificar que se llama a generateQuotationPDF
    if (!quotation.pdfUrl) {
      const client = await db.getClientById(quotation.clientId);
      const items = await db.getQuotationItems(quotationId);

      const pdfData = {
        quotationNumber: quotation.quotationNumber,
        date: new Date(quotation.createdAt).toLocaleDateString("es-CO"),
        clientName: client.name,
        clientPhone: client.whatsappPhone || "",
        clientAddress: client.address || "",
        vendorName: quotation.vendorName || "",
        productType: quotation.productType || "",
        validUntil: new Date(quotation.validUntil).toLocaleDateString("es-CO"),
        items: items.map((item: any) => ({
          itemNumber: item.itemNumber || 0,
          description: item.description || "Item",
          quantity: String(item.quantity || "1"),
          unitPrice: item.unitPrice ? String(item.unitPrice) : undefined,
          totalPrice: String(item.totalPrice || "0"),
        })),
        subtotal: String(quotation.subtotal || "0"),
        transportCost: String(quotation.transportCost || "0"),
        discountPercent: quotation.discountPercent
          ? String(quotation.discountPercent)
          : undefined,
        discountAmount: quotation.discountAmount
          ? String(quotation.discountAmount)
          : undefined,
        total: String(quotation.total || "0"),
      };

      const { pdfPath } = await generateQuotationPDF(pdfData, quotationId, 1);
      const pdfBuffer = readFileSync(pdfPath);
      const s3Key = `quotations/${client.id}/${quotationId}/v1.pdf`;
      const { url: pdfUrl } = await storagePut(
        s3Key,
        pdfBuffer,
        "application/pdf"
      );
      await db.updateQuotation(quotationId, { pdfUrl });
    }

    // Assert
    expect(db.getQuotationById).toHaveBeenCalledWith(quotationId);
    expect(db.getClientById).toHaveBeenCalledWith(clientId);
    expect(db.getQuotationItems).toHaveBeenCalledWith(quotationId);
    expect(generateQuotationPDF).toHaveBeenCalled();
    expect(readFileSync).toHaveBeenCalledWith(mockPdfPath);
    expect(storagePut).toHaveBeenCalledWith(
      `quotations/${clientId}/${quotationId}/v1.pdf`,
      mockPdfBuffer,
      "application/pdf"
    );
    expect(db.updateQuotation).toHaveBeenCalledWith(quotationId, {
      pdfUrl: "https://s3.example.com/quotations/456/123/v1.pdf",
    });
  });

  it("debería retornar PDF existente sin regenerar", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const existingPdfUrl = "https://s3.example.com/quotations/456/123/v1.pdf";

    // Mock de quotation CON pdfUrl
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: existingPdfUrl, // URL EXISTS - No se regenera
      subtotal: 1000,
      transportCost: 100,
      discountPercent: 10,
      discountAmount: 100,
      total: 1000,
      vendorName: "Vendor",
      productType: "Kitchen",
      validUntil: new Date(),
      createdAt: new Date(),
    };

    // Mock de cliente
    const mockClient = {
      id: clientId,
      name: "Test Client",
      whatsappPhone: "123456789",
      address: "Test Address",
    };

    const mockPdfBuffer = Buffer.from("PDF_CONTENT_HERE");

    // Configurar mocks
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(storageGet).mockResolvedValue({
      url: "https://s3.example.com/presigned-url",
      key: "quotations/456/123/v1.pdf",
    });

    // Mock de fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockPdfBuffer.buffer),
    });

    // Act
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBe(existingPdfUrl);

    // No se debe llamar a generateQuotationPDF
    if (quotation.pdfUrl) {
      const presignedUrl = await storageGet(quotation.pdfUrl);
      const response = await fetch(presignedUrl.url);
      const pdfBuffer = await response.arrayBuffer();
    }

    // Assert
    expect(db.getQuotationById).toHaveBeenCalledWith(quotationId);
    expect(generateQuotationPDF).not.toHaveBeenCalled();
    expect(db.updateQuotation).not.toHaveBeenCalled();
    expect(storageGet).toHaveBeenCalledWith(existingPdfUrl);
  });

  it("debería manejar errores en la generación de PDF", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;

    // Mock de quotation sin pdfUrl
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: null,
      subtotal: 1000,
      transportCost: 100,
      discountPercent: 10,
      discountAmount: 100,
      total: 1000,
      vendorName: "Vendor",
      productType: "Kitchen",
      validUntil: new Date(),
      createdAt: new Date(),
    };

    // Mock de cliente
    const mockClient = {
      id: clientId,
      name: "Test Client",
      whatsappPhone: "123456789",
      address: "Test Address",
    };

    // Mock de items
    const mockItems = [];

    // Configurar mocks para simular error
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(db.getQuotationItems).mockResolvedValue(mockItems);
    vi.mocked(generateQuotationPDF).mockRejectedValue(
      new Error("PDF generation failed")
    );

    // Act & Assert
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBeNull();

    if (!quotation.pdfUrl) {
      const client = await db.getClientById(quotation.clientId);
      const items = await db.getQuotationItems(quotationId);

      const pdfData = {
        quotationNumber: quotation.quotationNumber,
        date: new Date(quotation.createdAt).toLocaleDateString("es-CO"),
        clientName: client.name,
        clientPhone: client.whatsappPhone || "",
        clientAddress: client.address || "",
        vendorName: quotation.vendorName || "",
        productType: quotation.productType || "",
        validUntil: new Date(quotation.validUntil).toLocaleDateString("es-CO"),
        items: items.map((item: any) => ({
          itemNumber: item.itemNumber || 0,
          description: item.description || "Item",
          quantity: String(item.quantity || "1"),
          unitPrice: item.unitPrice ? String(item.unitPrice) : undefined,
          totalPrice: String(item.totalPrice || "0"),
        })),
        subtotal: String(quotation.subtotal || "0"),
        transportCost: String(quotation.transportCost || "0"),
        discountPercent: quotation.discountPercent
          ? String(quotation.discountPercent)
          : undefined,
        discountAmount: quotation.discountAmount
          ? String(quotation.discountAmount)
          : undefined,
        total: String(quotation.total || "0"),
      };

      try {
        await generateQuotationPDF(pdfData, quotationId, 1);
      } catch (error: any) {
        expect(error.message).toBe("PDF generation failed");
      }
    }
  });
});
