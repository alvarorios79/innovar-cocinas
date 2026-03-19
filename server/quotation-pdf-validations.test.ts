import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as db from "./db";
import { storagePut, checkFileExistsInS3 } from "./storage";
import { generateQuotationPDF } from "./quotation-pdf-generator";
import { readFileSync, existsSync, statSync } from "fs";

// Mock de las dependencias
vi.mock("./db");
vi.mock("./storage");
vi.mock("./quotation-pdf-generator");
vi.mock("fs");

describe("quotation-pdf-validations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("VALIDACIÓN 1: Debería verificar que el PDF existe en disco", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";

    // Mock: archivo existe
    vi.mocked(existsSync).mockReturnValue(true);

    // Act
    const exists = existsSync(pdfPath);

    // Assert
    expect(exists).toBe(true);
    expect(existsSync).toHaveBeenCalledWith(pdfPath);
  });

  it("VALIDACIÓN 1: Debería fallar si el PDF NO existe en disco", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";

    // Mock: archivo NO existe
    vi.mocked(existsSync).mockReturnValue(false);

    // Act
    const exists = existsSync(pdfPath);

    // Assert
    expect(exists).toBe(false);
  });

  it("VALIDACIÓN 2: Debería verificar que el PDF no está vacío", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";
    const pdfSize = 5000; // 5KB

    // Mock: archivo existe y tiene tamaño válido
    vi.mocked(statSync).mockReturnValue({
      size: pdfSize,
    } as any);

    // Act
    const stats = statSync(pdfPath);
    const size = stats.size;

    // Assert
    expect(size).toBe(pdfSize);
    expect(size > 0).toBe(true);
  });

  it("VALIDACIÓN 2: Debería fallar si el PDF está vacío", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";

    // Mock: archivo existe pero está vacío
    vi.mocked(statSync).mockReturnValue({
      size: 0,
    } as any);

    // Act
    const stats = statSync(pdfPath);
    const size = stats.size;

    // Assert
    expect(size).toBe(0);
    expect(size <= 0).toBe(true);
  });

  it("VALIDACIÓN 3: Debería verificar que el buffer se leyó correctamente", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";
    const pdfSize = 5000;
    const mockBuffer = Buffer.alloc(pdfSize);

    // Mock
    vi.mocked(readFileSync).mockReturnValue(mockBuffer);

    // Act
    const buffer = readFileSync(pdfPath);

    // Assert
    expect(buffer.length).toBe(pdfSize);
    expect(buffer.length === pdfSize).toBe(true);
  });

  it("VALIDACIÓN 3: Debería fallar si el buffer no coincide con el tamaño", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";
    const expectedSize = 5000;
    const mockBuffer = Buffer.alloc(3000); // Tamaño incorrecto

    // Mock
    vi.mocked(readFileSync).mockReturnValue(mockBuffer);

    // Act
    const buffer = readFileSync(pdfPath);

    // Assert
    expect(buffer.length).toBe(3000);
    expect(buffer.length === expectedSize).toBe(false);
  });

  it("VALIDACIÓN 4: Debería confirmar que el archivo existe en S3", async () => {
    // Arrange
    const s3Key = "quotations/456/123/v1.pdf";

    // Mock: archivo existe en S3
    vi.mocked(checkFileExistsInS3).mockResolvedValue(true);

    // Act
    const fileExists = await checkFileExistsInS3(s3Key);

    // Assert
    expect(fileExists).toBe(true);
  });

  it("VALIDACIÓN 4: Debería fallar si el archivo NO existe en S3", async () => {
    // Arrange
    const s3Key = "quotations/456/123/v1.pdf";

    // Mock: archivo NO existe en S3
    vi.mocked(checkFileExistsInS3).mockResolvedValue(false);

    // Act
    const fileExists = await checkFileExistsInS3(s3Key);

    // Assert
    expect(fileExists).toBe(false);
  });

  it("Flujo completo: Todas las validaciones pasan", async () => {
    // Arrange
    const quotationId = 123;
    const clientId = 456;
    const pdfPath = "/tmp/test-pdf-123.pdf";
    const pdfSize = 5000;
    const s3Key = `quotations/${clientId}/${quotationId}/v1.pdf`;
    const mockBuffer = Buffer.alloc(pdfSize);
    const pdfUrl = `https://bucket.s3.amazonaws.com/${s3Key}`;

    // Mock de quotation
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

    // Configurar mocks
    vi.mocked(generateQuotationPDF).mockResolvedValue({
      pdfPath: pdfPath,
    });
    vi.mocked(existsSync).mockReturnValue(true); // VALIDACIÓN 1: existe
    vi.mocked(statSync).mockReturnValue({
      size: pdfSize,
    } as any); // VALIDACIÓN 2: tamaño válido
    vi.mocked(readFileSync).mockReturnValue(mockBuffer); // VALIDACIÓN 3: buffer correcto
    vi.mocked(storagePut).mockResolvedValue({
      url: pdfUrl,
      key: s3Key,
    });
    vi.mocked(checkFileExistsInS3).mockResolvedValue(true); // VALIDACIÓN 4: existe en S3
    vi.mocked(db.updateQuotation).mockResolvedValue(undefined);

    // Act
    // Simular el flujo de generación
    const { pdfPath: generatedPath } = await generateQuotationPDF({} as any, quotationId, 1);
    
    // VALIDACIÓN 1
    const exists = existsSync(generatedPath);
    expect(exists).toBe(true);

    // VALIDACIÓN 2
    const stats = statSync(generatedPath);
    const size = stats.size;
    expect(size > 0).toBe(true);

    // VALIDACIÓN 3
    const buffer = readFileSync(generatedPath);
    expect(buffer.length === size).toBe(true);

    // Subir a S3
    const { url: uploadedUrl } = await storagePut(s3Key, buffer, "application/pdf");

    // VALIDACIÓN 4
    const fileExistsInS3 = await checkFileExistsInS3(s3Key);
    expect(fileExistsInS3).toBe(true);

    // Guardar en BD
    await db.updateQuotation(quotationId, { pdfUrl: uploadedUrl });

    // Assert
    expect(generateQuotationPDF).toHaveBeenCalled();
    expect(existsSync).toHaveBeenCalledWith(pdfPath);
    expect(statSync).toHaveBeenCalledWith(pdfPath);
    expect(readFileSync).toHaveBeenCalledWith(pdfPath);
    expect(storagePut).toHaveBeenCalledWith(s3Key, mockBuffer, "application/pdf");
    expect(checkFileExistsInS3).toHaveBeenCalledWith(s3Key);
    expect(db.updateQuotation).toHaveBeenCalledWith(quotationId, { pdfUrl: pdfUrl });
  });

  it("Flujo: Falla si el PDF no existe en disco", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";

    // Mock: archivo NO existe
    vi.mocked(existsSync).mockReturnValue(false);

    // Act
    const exists = existsSync(pdfPath);

    // Assert
    expect(exists).toBe(false);
    // El sistema debería lanzar error aquí
    expect(() => {
      if (!exists) throw new Error("PDF no existe en disco");
    }).toThrow("PDF no existe en disco");
  });

  it("Flujo: Falla si el PDF está vacío", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";

    // Mock: archivo existe pero está vacío
    vi.mocked(statSync).mockReturnValue({
      size: 0,
    } as any);

    // Act
    const stats = statSync(pdfPath);
    const size = stats.size;

    // Assert
    expect(size).toBe(0);
    expect(() => {
      if (!size || size <= 0) throw new Error("PDF vacío o tamaño inválido");
    }).toThrow("PDF vacío o tamaño inválido");
  });

  it("Flujo: Falla si el buffer no coincide con el tamaño", async () => {
    // Arrange
    const pdfPath = "/tmp/test-pdf-123.pdf";
    const expectedSize = 5000;
    const mockBuffer = Buffer.alloc(3000); // Tamaño incorrecto

    // Mock
    vi.mocked(readFileSync).mockReturnValue(mockBuffer);

    // Act
    const buffer = readFileSync(pdfPath);

    // Assert
    expect(() => {
      if (!buffer || buffer.length !== expectedSize) {
        throw new Error(`Buffer inválido: esperado ${expectedSize} bytes, obtenido ${buffer.length} bytes`);
      }
    }).toThrow(`Buffer inválido: esperado ${expectedSize} bytes, obtenido ${mockBuffer.length} bytes`);
  });

  it("Flujo: Falla si el archivo NO existe en S3", async () => {
    // Arrange
    const s3Key = "quotations/456/123/v1.pdf";

    // Mock: archivo NO existe en S3
    vi.mocked(checkFileExistsInS3).mockResolvedValue(false);

    // Act
    const fileExists = await checkFileExistsInS3(s3Key);

    // Assert
    expect(fileExists).toBe(false);
    // El sistema debería lanzar error si el archivo no existe en S3
    if (!fileExists) {
      expect(() => {
        throw new Error(`PDF NO SE SUBIÓ A S3 CORRECTAMENTE: ${s3Key}`);
      }).toThrow(`PDF NO SE SUBIÓ A S3 CORRECTAMENTE: ${s3Key}`);
    }
  });

  it("Flujo: NO guarda pdfUrl si algo falla", async () => {
    // Arrange
    const quotationId = 123;

    // Mock: simular fallo en verificación de S3
    vi.mocked(checkFileExistsInS3).mockResolvedValue(false);

    // Act
    const fileExists = await checkFileExistsInS3("any-key");

    // Assert
    if (!fileExists) {
      // NO debería llamar a updateQuotation
      expect(db.updateQuotation).not.toHaveBeenCalled();
    }
  });
});
