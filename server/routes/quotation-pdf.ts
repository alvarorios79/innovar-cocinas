import { Router, Request, Response } from "express";
import * as db from "../db";
import { storagePut, storageGet } from "../storage";
import { generateQuotationPDF } from "../quotation-pdf-generator";
import { readFileSync, unlinkSync } from "fs";

const router = Router();

/**
 * GET /api/quotations/pdf/:id
 * Servir PDF de cotización
 * ?download=true para descargar, sin parámetro para ver en navegador
 * 
 * FALLBACK: Si pdfUrl es NULL, genera el PDF automáticamente
 */
router.get("/quotations/pdf/:id", async (req: Request, res: Response) => {
  let pdfPath: string | null = null;

  try {
    const quotationId = parseInt(req.params.id);
    const download = req.query.download === "true";

    if (!quotationId) {
      return res.status(400).json({ error: "ID de cotización inválido" });
    }

    console.log(`[PDF-ENDPOINT] Solicitando PDF para cotización: ${quotationId}, download: ${download}`);

    // Obtener cotización
    const quotation = await db.getQuotationById(quotationId);
    if (!quotation) {
      console.error(`[PDF-ENDPOINT] Cotización no encontrada: ${quotationId}`);
      return res.status(404).json({ error: "Cotización no encontrada" });
    }

    console.log(`[PDF-ENDPOINT] Cotización encontrada: ${quotation.quotationNumber}, pdfUrl: ${quotation.pdfUrl ? "EXISTS" : "NULL"}`);

    // Obtener cliente
    const client = await db.getClientById(quotation.clientId);
    if (!client) {
      console.error(`[PDF-ENDPOINT] Cliente no encontrado: ${quotation.clientId}`);
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    // Si NO existe pdfUrl, generar PDF automáticamente (FALLBACK)
    if (!quotation.pdfUrl) {
      console.log(`[PDF-ENDPOINT] ⚠️ pdfUrl es NULL, generando PDF en fallback...`);

      try {
        // Obtener items de la cotización
        const quotationItems = await db.getQuotationItems(quotationId);
        console.log(`[PDF-ENDPOINT] Items obtenidos: ${quotationItems.length}`);

        // Preparar datos para el PDF
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: quotation.createdAt
            ? new Date(quotation.createdAt).toLocaleDateString("es-CO")
            : new Date().toLocaleDateString("es-CO"),
          clientName: client.name,
          clientPhone: client.whatsappPhone || "",
          clientAddress: client.address || "",
          vendorName: quotation.vendorName || "",
          productType: quotation.productType || "",
          validUntil: quotation.validUntil
            ? new Date(quotation.validUntil).toLocaleDateString("es-CO")
            : new Date().toLocaleDateString("es-CO"),
          items: quotationItems.map((item: any) => ({
            itemNumber: item.itemNumber || 0,
            description: item.description || "Item",
            quantity: String(item.quantity || "1"),
            unitPrice: item.unitPrice ? String(item.unitPrice) : undefined,
            totalPrice: String(item.totalPrice || "0"),
          })),
          subtotal: String(quotation.subtotal || "0"),
          transportCost: String(quotation.transportCost || "0"),
          discountPercent: quotation.discountPercent ? String(quotation.discountPercent) : undefined,
          discountAmount: quotation.discountAmount ? String(quotation.discountAmount) : undefined,
          total: String(quotation.total || "0"),
        };

        console.log(`[PDF-ENDPOINT] Generando PDF con PDFKit...`);
        const { pdfPath: generatedPath } = await generateQuotationPDF(pdfData, quotationId, 1);
        pdfPath = generatedPath;
        console.log(`[PDF-ENDPOINT] ✅ PDF generado en: ${pdfPath}`);

        // Leer buffer del PDF
        const pdfBuffer = readFileSync(pdfPath);
        console.log(`[PDF-ENDPOINT] Buffer leído, tamaño: ${pdfBuffer.length} bytes`);

        // Subir a S3
        const s3Key = `quotations/${client.id}/${quotationId}/v1.pdf`;
        console.log(`[PDF-ENDPOINT] Subiendo a S3 con clave: ${s3Key}`);
        const { url: pdfUrl } = await storagePut(s3Key, pdfBuffer, "application/pdf");
        console.log(`[PDF-ENDPOINT] ✅ PDF subido a S3. URL: ${pdfUrl}`);

        // Guardar URL en la base de datos
        console.log(`[PDF-ENDPOINT] Guardando URL en base de datos...`);
        await db.updateQuotation(quotationId, { pdfUrl });
        console.log(`[PDF-ENDPOINT] ✅ URL guardada en base de datos`);

        // Actualizar quotation con la nueva URL para usarla en esta respuesta
        quotation.pdfUrl = pdfUrl;

        console.log(`[PDF-ENDPOINT] Fallback completado exitosamente`);
      } catch (fallbackError: any) {
        console.error(`[PDF-ENDPOINT] ❌ ERROR en fallback de generación:`, fallbackError?.message);
        console.error(`[PDF-ENDPOINT] Stack:`, fallbackError?.stack);
        return res.status(500).json({
          error: "Error generando PDF",
          details: fallbackError?.message,
        });
      }
    }

    // En este punto, quotation.pdfUrl DEBE existir (o fue generado en fallback)
    if (!quotation.pdfUrl) {
      console.error(`[PDF-ENDPOINT] ❌ CRÍTICO: pdfUrl sigue siendo NULL después del fallback`);
      return res.status(500).json({ error: "Error crítico: No se pudo generar el PDF" });
    }

    // Obtener PDF desde S3
    console.log(`[PDF-ENDPOINT] Obteniendo PDF desde S3: ${quotation.pdfUrl}`);
    try {
      const presignedUrl = await storageGet(quotation.pdfUrl);
      console.log(`[PDF-ENDPOINT] URL presignada obtenida`);

      const response = await fetch(presignedUrl.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      console.log(`[PDF-ENDPOINT] ✅ PDF descargado de S3, tamaño: ${pdfBuffer.byteLength} bytes`);

      // Configurar headers
      const fileName = `${quotation.quotationNumber}.pdf`;
      res.setHeader("Content-Type", "application/pdf");

      if (download) {
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        console.log(`[PDF-ENDPOINT] Modo: DESCARGA`);
      } else {
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
        console.log(`[PDF-ENDPOINT] Modo: VISUALIZACIÓN`);
      }

      res.setHeader("Content-Length", pdfBuffer.byteLength);
      res.send(Buffer.from(pdfBuffer));

      console.log(`[PDF-ENDPOINT] ✅ PDF enviado al cliente exitosamente`);
    } catch (s3Error: any) {
      console.error(`[PDF-ENDPOINT] ❌ Error obteniendo PDF de S3:`, s3Error?.message);
      return res.status(500).json({
        error: "Error obteniendo PDF de S3",
        details: s3Error?.message,
      });
    }
  } catch (error: any) {
    console.error(`[PDF-ENDPOINT] ❌ Error general sirviendo PDF:`, error?.message);
    console.error(`[PDF-ENDPOINT] Stack:`, error?.stack);
    res.status(500).json({
      error: "Error sirviendo PDF",
      details: error?.message,
    });
  } finally {
    // Limpiar archivo temporal si existe
    if (pdfPath) {
      try {
        unlinkSync(pdfPath);
        console.log(`[PDF-ENDPOINT] Archivo temporal eliminado: ${pdfPath}`);
      } catch (cleanupError) {
        console.warn(`[PDF-ENDPOINT] Advertencia al eliminar archivo temporal:`, cleanupError);
      }
    }
  }
});

export default router;
