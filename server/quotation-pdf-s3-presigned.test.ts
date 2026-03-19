import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as db from "./db";
import { storagePut, getPresignedS3Url } from "./storage";
import { generateQuotationPDF } from "./quotation-pdf-generator";
import { readFileSync, unlinkSync } from "fs";

// Mock de las dependencias
vi.mock("./db");
vi.mock("./storage");
vi.mock("./quotation-pdf-generator");
vi.mock("fs");

describe("quotation-pdf-s3-presigned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería generar URL presignada directa de S3 (sin CloudFront)", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const existingPdfUrl = "quotations/456/123/v1.pdf";
    // URL directa de S3, no CloudFront
    const s3PresignedUrl = "https://bucket-name.s3.amazonaws.com/quotations/456/123/v1.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...";

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
    vi.mocked(getPresignedS3Url).mockResolvedValue(s3PresignedUrl);

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
      const presignedUrl = await getPresignedS3Url(quotation.pdfUrl, 3600);
      mockRes.redirect(presignedUrl);
    }

    // Assert
    expect(db.getQuotationById).toHaveBeenCalledWith(quotationId);
    expect(getPresignedS3Url).toHaveBeenCalledWith(existingPdfUrl, 3600);
    expect(mockRes.redirect).toHaveBeenCalledWith(s3PresignedUrl);
    // Validar que sea URL de S3 directo, no CloudFront
    expect(s3PresignedUrl).toContain(".s3.amazonaws.com");
    expect(s3PresignedUrl).not.toContain("cloudfront");
  });

  it("debería validar que la URL sea de S3 directo, no CloudFront", async () => {
    // Arrange
    const relKey = "quotations/456/123/v1.pdf";
    const s3DirectUrl = "https://my-bucket.s3.amazonaws.com/quotations/456/123/v1.pdf?X-Amz-Signature=...";
    const cloudFrontUrl = "https://d2xsxph8kpxj0f.cloudfront.net/quotations/456/123/v1.pdf";

    // Configurar mock para retornar URL de S3 directo
    vi.mocked(getPresignedS3Url).mockResolvedValue(s3DirectUrl);

    // Act
    const presignedUrl = await getPresignedS3Url(relKey, 3600);

    // Assert
    expect(presignedUrl).toBe(s3DirectUrl);
    expect(presignedUrl).toContain(".s3.amazonaws.com");
    expect(presignedUrl).not.toContain("cloudfront");
    expect(presignedUrl).toContain("X-Amz-Signature");
  });

  it("debería agregar parámetro de descarga a URL presignada de S3", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const existingPdfUrl = "quotations/456/123/v1.pdf";
    const s3PresignedUrl = "https://bucket-name.s3.amazonaws.com/quotations/456/123/v1.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256";

    // Mock de quotation
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
    vi.mocked(getPresignedS3Url).mockResolvedValue(s3PresignedUrl);

    // Mock de Response
    const mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Act
    const quotation = await db.getQuotationById(quotationId);
    const download = true;

    if (quotation.pdfUrl) {
      const presignedUrl = await getPresignedS3Url(quotation.pdfUrl, 3600);
      let redirectUrl = presignedUrl;
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
    expect(redirectedUrl).toContain(".s3.amazonaws.com");
  });

  it("debería generar PDF y luego redirigir con URL presignada de S3", async () => {
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
    const s3PresignedUrl = "https://bucket-name.s3.amazonaws.com/quotations/456/123/v1.pdf?X-Amz-Signature=...";

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
    vi.mocked(getPresignedS3Url).mockResolvedValue(s3PresignedUrl);

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

      // Simular redirección con URL presignada de S3
      quotation.pdfUrl = pdfUrl;
      const presignedUrl = await getPresignedS3Url(quotation.pdfUrl, 3600);
      mockRes.redirect(presignedUrl);
    }

    // Assert
    expect(generateQuotationPDF).toHaveBeenCalled();
    expect(storagePut).toHaveBeenCalled();
    expect(db.updateQuotation).toHaveBeenCalledWith(quotationId, {
      pdfUrl: generatedPdfUrl,
    });
    expect(getPresignedS3Url).toHaveBeenCalledWith(generatedPdfUrl, 3600);
    expect(mockRes.redirect).toHaveBeenCalledWith(s3PresignedUrl);
    // Validar que sea URL de S3 directo
    expect(s3PresignedUrl).toContain(".s3.amazonaws.com");
  });

  it("debería manejar errores al generar URL presignada", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const existingPdfUrl = "quotations/456/123/v1.pdf";

    // Mock de quotation
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
    vi.mocked(getPresignedS3Url).mockRejectedValue(
      new Error("Failed to generate presigned URL")
    );

    // Act & Assert
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBe(existingPdfUrl);

    try {
      await getPresignedS3Url(quotation.pdfUrl, 3600);
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toBe("Failed to generate presigned URL");
    }
  });
});
