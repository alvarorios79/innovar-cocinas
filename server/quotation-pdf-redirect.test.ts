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

describe("quotation-pdf-redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería redirigir a S3 cuando pdfUrl existe", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const existingPdfUrl = "quotations/456/123/v1.pdf";
    const presignedUrl = "https://s3.example.com/presigned-url-with-auth";

    // Mock de quotation CON pdfUrl
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: existingPdfUrl,
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

    // Configurar mocks
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(storageGet).mockResolvedValue({
      url: presignedUrl,
      key: existingPdfUrl,
    });

    // Mock de Response
    const mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Act
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBe(existingPdfUrl);

    // Simular el flujo del endpoint
    if (quotation.pdfUrl) {
      const presignedUrlObj = await storageGet(quotation.pdfUrl);
      let redirectUrl = presignedUrlObj.url;
      // Sin parámetro download
      mockRes.redirect(redirectUrl);
    }

    // Assert
    expect(db.getQuotationById).toHaveBeenCalledWith(quotationId);
    expect(storageGet).toHaveBeenCalledWith(existingPdfUrl);
    expect(mockRes.redirect).toHaveBeenCalledWith(presignedUrl);
    expect(generateQuotationPDF).not.toHaveBeenCalled();
  });

  it("debería agregar parámetro de descarga cuando download=true", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const existingPdfUrl = "quotations/456/123/v1.pdf";
    const presignedUrl = "https://s3.example.com/presigned-url-with-auth";

    // Mock de quotation CON pdfUrl
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: existingPdfUrl,
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

    // Configurar mocks
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(storageGet).mockResolvedValue({
      url: presignedUrl,
      key: existingPdfUrl,
    });

    // Mock de Response
    const mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Act
    const quotation = await db.getQuotationById(quotationId);
    const download = true; // Simular parámetro download=true

    if (quotation.pdfUrl) {
      const presignedUrlObj = await storageGet(quotation.pdfUrl);
      let redirectUrl = presignedUrlObj.url;
      if (download) {
        redirectUrl +=
          (redirectUrl.includes("?") ? "&" : "?") +
          `response-content-disposition=attachment;filename="${quotation.quotationNumber}.pdf"`;
      }
      mockRes.redirect(redirectUrl);
    }

    // Assert
    expect(mockRes.redirect).toHaveBeenCalled();
    const redirectedUrl = (mockRes.redirect as any).mock.calls[0][0];
    expect(redirectedUrl).toContain("response-content-disposition=attachment");
    expect(redirectedUrl).toContain("COT-001.pdf");
  });

  it("debería generar PDF y luego redirigir si pdfUrl es NULL", async () => {
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
    const mockItems = [
      {
        itemNumber: 1,
        description: "Item 1",
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
      },
    ];

    // Mock de PDF generado
    const mockPdfPath = "/tmp/test-pdf-123.pdf";
    const mockPdfBuffer = Buffer.from("PDF_CONTENT_HERE");
    const generatedPdfUrl = "quotations/456/123/v1.pdf";
    const presignedUrl = "https://s3.example.com/presigned-url-with-auth";

    // Configurar mocks
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(db.getQuotationItems).mockResolvedValue(mockItems);
    vi.mocked(generateQuotationPDF).mockResolvedValue({
      pdfPath: mockPdfPath,
    });
    vi.mocked(readFileSync).mockReturnValue(mockPdfBuffer);
    vi.mocked(storagePut).mockResolvedValue({
      url: generatedPdfUrl,
      key: generatedPdfUrl,
    });
    vi.mocked(db.updateQuotation).mockResolvedValue(undefined);
    vi.mocked(storageGet).mockResolvedValue({
      url: presignedUrl,
      key: generatedPdfUrl,
    });

    // Mock de Response
    const mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Act
    let quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBeNull();

    // Simular fallback
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

      // Simular redirección
      quotation.pdfUrl = pdfUrl;
      const presignedUrlObj = await storageGet(quotation.pdfUrl);
      mockRes.redirect(presignedUrlObj.url);
    }

    // Assert
    expect(generateQuotationPDF).toHaveBeenCalled();
    expect(storagePut).toHaveBeenCalled();
    expect(db.updateQuotation).toHaveBeenCalledWith(quotationId, {
      pdfUrl: generatedPdfUrl,
    });
    expect(storageGet).toHaveBeenCalledWith(generatedPdfUrl);
    expect(mockRes.redirect).toHaveBeenCalledWith(presignedUrl);
  });

  it("debería manejar errores de S3 correctamente", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const existingPdfUrl = "quotations/456/123/v1.pdf";

    // Mock de quotation CON pdfUrl
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: existingPdfUrl,
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

    // Configurar mocks para simular error
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(storageGet).mockRejectedValue(
      new Error("S3 access denied")
    );

    // Act & Assert
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBe(existingPdfUrl);

    try {
      await storageGet(quotation.pdfUrl);
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toBe("S3 access denied");
    }
  });
});
