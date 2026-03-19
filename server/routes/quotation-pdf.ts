import { Router, Request, Response } from "express";
import * as db from "../db";
import { storagePut, getPresignedS3Url, getPresignedS3UrlWithCheck, checkFileExistsInS3 } from "../storage";
import { generateQuotationPDF } from "../quotation-pdf-generator";
import { readFileSync, unlinkSync, existsSync, statSync } from "fs";

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

        console.log(`[PDF-ENDPOINT] PASO 1: Generando PDF con PDFKit...`);
        const { pdfPath: generatedPath } = await generateQuotationPDF(pdfData, quotationId, 1);
        pdfPath = generatedPath;
        console.log(`[PDF-ENDPOINT] ✅ PDF generado en: ${pdfPath}`);

        // VALIDACIÓN 1: Verificar que el PDF existe en disco
        console.log(`[PDF-ENDPOINT] VALIDACIÓN 1: Verificando existencia del PDF en disco...`);
        if (!existsSync(pdfPath)) {
          throw new Error(`PDF no existe en disco: ${pdfPath}`);
        }
        console.log(`[PDF-ENDPOINT] ✅ PDF existe en disco`);

        // VALIDACIÓN 2: Verificar que el PDF no está vacío
        console.log(`[PDF-ENDPOINT] VALIDACIÓN 2: Verificando tamaño del PDF...`);
        const pdfStats = statSync(pdfPath);
        const pdfSize = pdfStats.size;
        if (!pdfSize || pdfSize <= 0) {
          throw new Error(`PDF vacío o tamaño inválido: ${pdfSize} bytes`);
        }
        console.log(`[PDF-ENDPOINT] ✅ PDF válido, tamaño: ${pdfSize} bytes`);

        // Leer buffer del PDF
        console.log(`[PDF-ENDPOINT] PASO 2: Leyendo buffer del PDF...`);
        const pdfBuffer = readFileSync(pdfPath);
        if (!pdfBuffer || pdfBuffer.length !== pdfSize) {
          throw new Error(`Buffer inválido: esperado ${pdfSize} bytes, obtenido ${pdfBuffer.length} bytes`);
        }
        console.log(`[PDF-ENDPOINT] ✅ Buffer leído correctamente, tamaño: ${pdfBuffer.length} bytes`);

        // PASO 3: Subir a S3
        const s3Key = `quotations/${client.id}/${quotationId}/v1.pdf`;
        console.log(`[PDF-ENDPOINT] PASO 3: Subiendo PDF a S3 con clave: ${s3Key}`);
        const { url: pdfUrl } = await storagePut(s3Key, pdfBuffer, "application/pdf");
        console.log(`[PDF-ENDPOINT] ✅ PDF subido a S3. URL: ${pdfUrl}`);

        // VALIDACIÓN 3: Verificar que el archivo realmente existe en S3
        console.log(`[PDF-ENDPOINT] VALIDACIÓN 3: Confirmando existencia en S3...`);
        const fileExistsInS3 = await checkFileExistsInS3(s3Key);
        if (!fileExistsInS3) {
          throw new Error(`PDF NO SE SUBIÓ A S3 CORRECTAMENTE: ${s3Key}`);
        }
        console.log(`[PDF-ENDPOINT] ✅ PDF confirmado en S3`);

        // PASO 4: Guardar URL en la base de datos
        console.log(`[PDF-ENDPOINT] PASO 4: Guardando URL en base de datos...`);
        await db.updateQuotation(quotationId, { pdfUrl });
        console.log(`[PDF-ENDPOINT] ✅ URL guardada en base de datos: ${pdfUrl}`);

        // Actualizar quotation con la nueva URL para usarla en esta respuesta
        quotation.pdfUrl = pdfUrl;

        console.log(`[PDF-ENDPOINT] ✅ FALLBACK COMPLETADO EXITOSAMENTE - PDF GARANTIZADO EN S3`);
      } catch (fallbackError: any) {
        console.error(`[PDF-ENDPOINT] ❌ ERROR CRÍTICO EN FALLBACK:`, fallbackError?.message);
        console.error(`[PDF-ENDPOINT] Stack:`, fallbackError?.stack);
        
        // IMPORTANTE: NO guardar pdfUrl si algo falló
        // El sistema se detiene completamente
        return res.status(500).json({
          error: "Error crítico generando PDF - Sistema detenido",
          details: fallbackError?.message,
          message: "El PDF no se pudo generar ni subir a S3. Por favor, intenta de nuevo.",
        });
      }
    }

    // En este punto, quotation.pdfUrl DEBE existir (o fue generado en fallback)
    if (!quotation.pdfUrl) {
      console.error(`[PDF-ENDPOINT] ❌ CRÍTICO: pdfUrl sigue siendo NULL después del fallback`);
      return res.status(500).json({ error: "Error crítico: No se pudo generar el PDF" });
    }

    // Verificar si el archivo existe en S3 y generar URL presignada
    console.log(`[PDF-ENDPOINT] Verificando existencia del archivo en S3: ${quotation.pdfUrl}`);
    try {
      // Verificar si el archivo existe en S3
      const fileExists = await checkFileExistsInS3(quotation.pdfUrl);
      
      if (!fileExists) {
        console.warn(`[PDF-ENDPOINT] ⚠️ Archivo no existe en S3: ${quotation.pdfUrl}`);
        console.log(`[PDF-ENDPOINT] Regenerando PDF...`);
        
        // Regenerar el PDF
        try {
          const quotationItems = await db.getQuotationItems(quotationId);
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
          console.log(`[PDF-ENDPOINT] ✅ PDF regenerado en: ${pdfPath}`);

          // Leer buffer del PDF
          const pdfBuffer = readFileSync(pdfPath);
          console.log(`[PDF-ENDPOINT] Buffer leído, tamaño: ${pdfBuffer.length} bytes`);

          // Subir a S3
          const s3Key = `quotations/${client.id}/${quotationId}/v1.pdf`;
          console.log(`[PDF-ENDPOINT] Subiendo PDF regenerado a S3 con clave: ${s3Key}`);
          const { url: pdfUrl } = await storagePut(s3Key, pdfBuffer, "application/pdf");
          console.log(`[PDF-ENDPOINT] ✅ PDF regenerado subido a S3. URL: ${pdfUrl}`);

          // Guardar URL en la base de datos
          console.log(`[PDF-ENDPOINT] Actualizando URL en base de datos...`);
          await db.updateQuotation(quotationId, { pdfUrl });
          console.log(`[PDF-ENDPOINT] ✅ URL actualizada en base de datos`);

          // Actualizar quotation con la nueva URL
          quotation.pdfUrl = pdfUrl;
        } catch (regenerateError: any) {
          console.error(`[PDF-ENDPOINT] ❌ Error regenerando PDF:`, regenerateError?.message);
          return res.status(500).json({
            error: "Error regenerando PDF",
            details: regenerateError?.message,
          });
        }
      }

      // VALIDACIÓN FINAL: Verificar una última vez que el archivo existe REALMENTE en S3
      console.log(`[PDF-ENDPOINT] VALIDACIÓN FINAL: Verificando existencia real del archivo en S3...`);
      const finalFileCheck = await checkFileExistsInS3(quotation.pdfUrl);
      
      if (!finalFileCheck) {
        console.error(`[PDF-ENDPOINT] ❌ CRÍTICO: Archivo no existe en S3 después de regeneración: ${quotation.pdfUrl}`);
        return res.status(500).json({
          error: "Error crítico: PDF no disponible en S3 después de regeneración",
          details: "El archivo no pudo ser verificado en S3",
        });
      }
      
      console.log(`[PDF-ENDPOINT] ✅ VALIDACIÓN FINAL PASADA: Archivo existe en S3`);
      
      // Obtener URL presignada directa de S3
      console.log(`[PDF-ENDPOINT] Generando URL presignada directa de S3: ${quotation.pdfUrl}`);
      const presignedUrl = await getPresignedS3Url(quotation.pdfUrl, 3600);
      console.log(`[PDF-ENDPOINT] ✅ URL presignada de S3 generada (directa, sin CloudFront)`);
      console.log(`[PDF-ENDPOINT] URL: ${presignedUrl.substring(0, 80)}...`);

      // Si es descarga, agregar parámetro a la URL presignada
      let redirectUrl = presignedUrl;
      if (download) {
        console.log(`[PDF-ENDPOINT] Modo: DESCARGA - Agregando parámetro de descarga`);
        redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + `response-content-disposition=attachment;filename="${quotation.quotationNumber}.pdf"`;
      } else {
        console.log(`[PDF-ENDPOINT] Modo: VISUALIZACIÓN - Redirigiendo a S3`);
      }

      console.log(`[PDF-ENDPOINT] ✅ Redirigiendo al cliente a S3 (URL directa)`);
      return res.redirect(redirectUrl);
    } catch (s3Error: any) {
      console.error(`[PDF-ENDPOINT] ❌ Error verificando/generando URL presignada de S3:`, s3Error?.message);
      return res.status(500).json({
        error: "Error verificando/generando URL presignada de S3",
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
