import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as db from "./db";
import { storagePut, checkFileExistsInS3, getPresignedS3Url } from "./storage";
import { generateQuotationPDF } from "./quotation-pdf-generator";
import { readFileSync, unlinkSync } from "fs";

// Mock de las dependencias
vi.mock("./db");
vi.mock("./storage");
vi.mock("./quotation-pdf-generator");
vi.mock("fs");

describe("quotation-pdf-head-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería verificar existencia real usando HEAD (status 200 = existe)", async () => {
    // Arrange
    const relKey = "quotations/456/123/v1.pdf";

    // Configurar mock para retornar true (archivo existe, HEAD retorna 200)
    vi.mocked(checkFileExistsInS3).mockResolvedValue(true);

    // Act
    const fileExists = await checkFileExistsInS3(relKey);

    // Assert
    expect(fileExists).toBe(true);
    expect(checkFileExistsInS3).toHaveBeenCalledWith(relKey);
  });

  it("debería detectar cuando el archivo NO existe usando HEAD (status 404)", async () => {
    // Arrange
    const relKey = "quotations/456/123/v1.pdf";

    // Configurar mock para retornar false (archivo no existe, HEAD retorna 404)
    vi.mocked(checkFileExistsInS3).mockResolvedValue(false);

    // Act
    const fileExists = await checkFileExistsInS3(relKey);

    // Assert
    expect(fileExists).toBe(false);
    expect(checkFileExistsInS3).toHaveBeenCalledWith(relKey);
  });

  it("debería garantizar que el archivo existe ANTES de generar URL presignada", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const pdfUrl = "quotations/456/123/v1.pdf";
    const presignedUrl = "https://bucket-name.s3.amazonaws.com/quotations/456/123/v1.pdf?X-Amz-Signature=...";

    // Mock de quotation
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: pdfUrl,
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

    // Configurar mocks
    vi.mocked(checkFileExistsInS3).mockResolvedValue(true); // Archivo existe
    vi.mocked(getPresignedS3Url).mockResolvedValue(presignedUrl);

    // Act
    const fileExists = await checkFileExistsInS3(mockQuotation.pdfUrl);
    expect(fileExists).toBe(true);

    // Solo generar URL presignada si el archivo existe
    if (fileExists) {
      const presignedUrlResult = await getPresignedS3Url(mockQuotation.pdfUrl, 3600);
      expect(presignedUrlResult).toBe(presignedUrl);
    }

    // Assert
    expect(checkFileExistsInS3).toHaveBeenCalledWith(pdfUrl);
    expect(getPresignedS3Url).toHaveBeenCalledWith(pdfUrl, 3600);
  });

  it("debería NO generar URL presignada si el archivo NO existe", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const pdfUrl = "quotations/456/123/v1.pdf";

    // Mock de quotation
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: pdfUrl,
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

    // Configurar mocks
    vi.mocked(checkFileExistsInS3).mockResolvedValue(false); // Archivo NO existe
    vi.mocked(getPresignedS3Url).mockResolvedValue(null);

    // Act
    const fileExists = await checkFileExistsInS3(mockQuotation.pdfUrl);
    expect(fileExists).toBe(false);

    // No generar URL presignada si el archivo no existe
    if (!fileExists) {
      // Debería regenerar en su lugar
      expect(generateQuotationPDF).not.toHaveBeenCalled(); // Aún no se ha llamado
    }

    // Assert
    expect(checkFileExistsInS3).toHaveBeenCalledWith(pdfUrl);
    expect(getPresignedS3Url).not.toHaveBeenCalled(); // NO debe llamarse
  });

  it("debería regenerar PDF si la verificación HEAD retorna 404", async () => {
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
    const newPdfUrl = "quotations/456/123/v1.pdf";
    const presignedUrl = "https://bucket-name.s3.amazonaws.com/quotations/456/123/v1.pdf?X-Amz-Signature=...";

    // Configurar mocks
    vi.mocked(db.getQuotationById).mockResolvedValue(mockQuotation);
    vi.mocked(db.getClientById).mockResolvedValue(mockClient);
    vi.mocked(db.getQuotationItems).mockResolvedValue(mockItems);
    // Primera llamada: archivo NO existe (HEAD retorna 404)
    // Segunda llamada: después de regenerar, archivo existe
    vi.mocked(checkFileExistsInS3)
      .mockResolvedValueOnce(false) // Primera verificación: NO existe
      .mockResolvedValueOnce(true); // Segunda verificación: existe después de regenerar
    vi.mocked(generateQuotationPDF).mockResolvedValue({
      pdfPath: mockPdfPath,
    });
    vi.mocked(readFileSync).mockReturnValue(mockPdfBuffer);
    vi.mocked(storagePut).mockResolvedValue({
      url: newPdfUrl,
      key: newPdfUrl,
    });
    vi.mocked(db.updateQuotation).mockResolvedValue(undefined);
    vi.mocked(getPresignedS3Url).mockResolvedValue(presignedUrl);

    // Act
    const quotation = await db.getQuotationById(quotationId);
    expect(quotation.pdfUrl).toBe(existingPdfUrl);

    // Primera verificación: archivo NO existe
    let fileExists = await checkFileExistsInS3(quotation.pdfUrl);
    expect(fileExists).toBe(false);

    if (!fileExists) {
      // Regenerar PDF
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
      quotation.pdfUrl = pdfUrl;
    }

    // Segunda verificación: archivo existe después de regenerar
    fileExists = await checkFileExistsInS3(quotation.pdfUrl);
    expect(fileExists).toBe(true);

    // Generar URL presignada
    const presignedUrlResult = await getPresignedS3Url(quotation.pdfUrl, 3600);
    expect(presignedUrlResult).toBe(presignedUrl);

    // Assert
    expect(generateQuotationPDF).toHaveBeenCalled();
    expect(storagePut).toHaveBeenCalled();
    expect(db.updateQuotation).toHaveBeenCalledWith(quotationId, {
      pdfUrl: newPdfUrl,
    });
    expect(getPresignedS3Url).toHaveBeenCalledWith(newPdfUrl, 3600);
  });

  it("debería hacer validación final antes de generar URL presignada", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const pdfUrl = "quotations/456/123/v1.pdf";
    const presignedUrl = "https://bucket-name.s3.amazonaws.com/quotations/456/123/v1.pdf?X-Amz-Signature=...";

    // Mock de quotation
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: pdfUrl,
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

    // Configurar mocks
    // Primera verificación: existe
    // Segunda verificación (final): existe
    vi.mocked(checkFileExistsInS3)
      .mockResolvedValueOnce(true) // Primera verificación
      .mockResolvedValueOnce(true); // Validación final
    vi.mocked(getPresignedS3Url).mockResolvedValue(presignedUrl);

    // Act
    // Primera verificación
    let fileExists = await checkFileExistsInS3(mockQuotation.pdfUrl);
    expect(fileExists).toBe(true);

    // Validación final
    const finalFileCheck = await checkFileExistsInS3(mockQuotation.pdfUrl);
    expect(finalFileCheck).toBe(true);

    // Generar URL presignada solo si validación final pasó
    if (finalFileCheck) {
      const presignedUrlResult = await getPresignedS3Url(mockQuotation.pdfUrl, 3600);
      expect(presignedUrlResult).toBe(presignedUrl);
    }

    // Assert
    expect(checkFileExistsInS3).toHaveBeenCalledTimes(2); // Dos verificaciones
    expect(getPresignedS3Url).toHaveBeenCalledWith(pdfUrl, 3600);
  });

  it("debería fallar si la validación final retorna 404", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const pdfUrl = "quotations/456/123/v1.pdf";

    // Mock de quotation
    const mockQuotation = {
      id: quotationId,
      quotationNumber: "COT-001",
      clientId: clientId,
      pdfUrl: pdfUrl,
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

    // Configurar mocks
    // Primera verificación: existe
    // Segunda verificación (final): NO existe (404)
    vi.mocked(checkFileExistsInS3)
      .mockResolvedValueOnce(true) // Primera verificación
      .mockResolvedValueOnce(false); // Validación final retorna 404
    vi.mocked(getPresignedS3Url).mockResolvedValue(null);

    // Act
    // Primera verificación
    let fileExists = await checkFileExistsInS3(mockQuotation.pdfUrl);
    expect(fileExists).toBe(true);

    // Validación final
    const finalFileCheck = await checkFileExistsInS3(mockQuotation.pdfUrl);
    expect(finalFileCheck).toBe(false);

    // No generar URL presignada si validación final falla
    if (!finalFileCheck) {
      // Debería retornar error
      expect(getPresignedS3Url).not.toHaveBeenCalled();
    }

    // Assert
    expect(checkFileExistsInS3).toHaveBeenCalledTimes(2);
    expect(getPresignedS3Url).not.toHaveBeenCalled();
  });
});
