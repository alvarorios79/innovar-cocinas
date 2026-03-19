/**
 * Helper para generación y almacenamiento de PDFs de cotizaciones
 * Encapsula toda la lógica de generación, validación y almacenamiento
 */

import { readFileSync, unlinkSync } from "fs";
import { generateQuotationPDF } from "./quotation-pdf-generator";
import { storagePut } from "./storage";
import * as db from "./db";

/**
 * Genera un PDF de cotización, lo sube a S3 y guarda la URL en la base de datos
 * 
 * @param quotationId - ID de la cotización
 * @param clientId - ID del cliente
 * @param quotationData - Datos de la cotización desde BD
 * @param version - Versión del PDF (default: 1)
 * @returns { success: boolean, pdfUrl?: string, error?: string }
 */
export async function generateAndStorePDF(
  quotationId: number,
  clientId: number,
  quotationData: any,
  version: number = 1
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  let pdfPath: string | null = null;

  try {
    console.log(`[PDF-HELPER] Iniciando generación de PDF para cotización: ${quotationId}`);

    // PASO 1: Obtener items de la cotización
    console.log(`[PDF-HELPER] Obteniendo items de la cotización...`);
    const quotationItems = await db.getQuotationItems(quotationId);
    console.log(`[PDF-HELPER] ${quotationItems.length} items obtenidos`);

    // PASO 2: Preparar datos para el PDF (convertir a strings)
    console.log(`[PDF-HELPER] Preparando datos para PDF...`);
    const pdfData = {
      quotationNumber: quotationData.quotationNumber,
      date: quotationData.createdAt
        ? new Date(quotationData.createdAt).toLocaleDateString("es-CO")
        : new Date().toLocaleDateString("es-CO"),
      clientName: quotationData.clientName || "Cliente",
      clientPhone: quotationData.clientPhone || "",
      clientAddress: quotationData.clientAddress || "",
      vendorName: quotationData.vendorName || "",
      productType: quotationData.productType || "",
      validUntil: quotationData.validUntil
        ? new Date(quotationData.validUntil).toLocaleDateString("es-CO")
        : new Date().toLocaleDateString("es-CO"),
      items: quotationItems.map((item: any) => ({
        itemNumber: item.itemNumber || 0,
        description: item.description || "Item",
        quantity: String(item.quantity || "1"),
        unitPrice: item.unitPrice ? String(item.unitPrice) : undefined,
        totalPrice: String(item.totalPrice || "0"),
      })),
      subtotal: String(quotationData.subtotal || "0"),
      transportCost: String(quotationData.transportCost || "0"),
      discountPercent: quotationData.discountPercent ? String(quotationData.discountPercent) : undefined,
      discountAmount: quotationData.discountAmount ? String(quotationData.discountAmount) : undefined,
      total: String(quotationData.total || "0"),
    };

    // PASO 3: Generar PDF
    console.log(`[PDF-HELPER] Generando PDF con PDFKit...`);
    const { pdfPath: generatedPath } = await generateQuotationPDF(pdfData, quotationId, version);
    pdfPath = generatedPath;
    console.log(`[PDF-HELPER] PDF generado exitosamente en: ${pdfPath}`);

    // PASO 4: Leer el buffer del PDF
    console.log(`[PDF-HELPER] Leyendo buffer del PDF...`);
    const pdfBuffer = readFileSync(pdfPath);
    console.log(`[PDF-HELPER] Buffer leído exitosamente, tamaño: ${pdfBuffer.length} bytes`);

    // PASO 5: Subir a S3
    const s3Key = `quotations/${clientId}/${quotationId}/v${version}.pdf`;
    console.log(`[PDF-HELPER] Subiendo a S3 con clave: ${s3Key}`);
    const { url: pdfUrl } = await storagePut(s3Key, pdfBuffer, "application/pdf");
    console.log(`[PDF-HELPER] PDF subido a S3 exitosamente. URL: ${pdfUrl}`);

    // PASO 6: Guardar URL en la base de datos
    console.log(`[PDF-HELPER] Guardando URL en base de datos...`);
    await db.updateQuotation(quotationId, { pdfUrl });
    console.log(`[PDF-HELPER] URL guardada en base de datos exitosamente`);

    // PASO 7: Limpiar archivo temporal
    try {
      unlinkSync(pdfPath);
      console.log(`[PDF-HELPER] Archivo temporal eliminado: ${pdfPath}`);
    } catch (cleanupError) {
      console.warn(`[PDF-HELPER] Advertencia al eliminar archivo temporal: ${cleanupError}`);
    }

    return { success: true, pdfUrl };
  } catch (error: any) {
    const errorMessage = error?.message || "Error desconocido";
    const errorStack = error?.stack || "";
    
    console.error(`[PDF-HELPER] ❌ ERROR en generación de PDF:`);
    console.error(`[PDF-HELPER] Mensaje: ${errorMessage}`);
    console.error(`[PDF-HELPER] Stack: ${errorStack}`);
    console.error(`[PDF-HELPER] Cotización ID: ${quotationId}`);
    console.error(`[PDF-HELPER] Cliente ID: ${clientId}`);

    // Limpiar archivo temporal si existe
    if (pdfPath) {
      try {
        unlinkSync(pdfPath);
        console.log(`[PDF-HELPER] Archivo temporal eliminado después del error: ${pdfPath}`);
      } catch (cleanupError) {
        console.warn(`[PDF-HELPER] Advertencia al eliminar archivo temporal: ${cleanupError}`);
      }
    }

    return {
      success: false,
      error: `Error generando PDF: ${errorMessage}`,
    };
  }
}

/**
 * Obtiene el PDF de una cotización, generándolo si no existe
 * 
 * @param quotationId - ID de la cotización
 * @returns { pdfUrl: string, isNewlyGenerated: boolean } o lanza error
 */
export async function getOrGeneratePDF(quotationId: number): Promise<{
  pdfUrl: string;
  isNewlyGenerated: boolean;
}> {
  try {
    console.log(`[PDF-HELPER] Obteniendo PDF para cotización: ${quotationId}`);

    // Obtener cotización
    const quotation = await db.getQuotationById(quotationId);
    if (!quotation) {
      throw new Error(`Cotización no encontrada: ${quotationId}`);
    }

    // Si ya tiene pdfUrl, retornar
    if (quotation.pdfUrl) {
      console.log(`[PDF-HELPER] PDF ya existe para cotización: ${quotationId}`);
      return { pdfUrl: quotation.pdfUrl, isNewlyGenerated: false };
    }

    // Si no tiene pdfUrl, generar
    console.log(`[PDF-HELPER] PDF no existe, generando para cotización: ${quotationId}`);
    
    const client = await db.getClientById(quotation.clientId);
    if (!client) {
      throw new Error(`Cliente no encontrado: ${quotation.clientId}`);
    }

    // Preparar datos de la cotización para el helper
    const quotationDataForPDF = {
      quotationNumber: quotation.quotationNumber,
      createdAt: quotation.createdAt,
      clientName: client.name,
      clientPhone: client.whatsappPhone,
      clientAddress: client.address,
      vendorName: quotation.vendorName,
      productType: quotation.productType,
      validUntil: quotation.validUntil,
      subtotal: quotation.subtotal,
      transportCost: quotation.transportCost,
      discountPercent: quotation.discountPercent,
      discountAmount: quotation.discountAmount,
      total: quotation.total,
    };

    const result = await generateAndStorePDF(quotationId, quotation.clientId, quotationDataForPDF, 1);

    if (!result.success) {
      throw new Error(result.error || "Error desconocido generando PDF");
    }

    if (!result.pdfUrl) {
      throw new Error("PDF generado pero no se obtuvo URL");
    }

    return { pdfUrl: result.pdfUrl, isNewlyGenerated: true };
  } catch (error: any) {
    console.error(`[PDF-HELPER] Error en getOrGeneratePDF:`, error?.message);
    throw error;
  }
}
