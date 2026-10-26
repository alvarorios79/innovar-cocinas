import { Router, Request, Response } from "express";
import * as db from "../db";
import { storagePut, getPresignedS3Url, checkFileExistsInS3 } from "../storage";
import { generateQuotationPDF } from "../quotation-pdf-generator";
import { readFileSync, unlinkSync, existsSync, statSync } from "fs";

const router = Router();

/**
 * Genera el buffer del PDF para una cotización dada.
 * Reutilizable tanto para descarga directa como para subida a S3.
 */
async function buildPDFBuffer(quotation: any, client: any, quotationId: number): Promise<{ buffer: Buffer; pdfPath: string }> {
  const quotationItems = await db.getQuotationItems(quotationId);

  const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(Number(value));

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

  const versionNumber = quotation.versionNumber || 1;
  const { pdfPath } = await generateQuotationPDF(pdfData, quotationId, versionNumber);

  if (!existsSync(pdfPath)) throw new Error(`PDF no generado en disco: ${pdfPath}`);

  const buffer = readFileSync(pdfPath);
  return { buffer, pdfPath };
}

/**
 * GET /api/quotations/pdf/:id
 *
 * ?download=true  → descarga directa (stream sin S3)
 * sin parámetro   → intenta S3; si no disponible, stream directo
 */
router.get("/quotations/pdf/:id", async (req: Request, res: Response) => {
  let pdfPath: string | null = null;

  try {
    const quotationId = parseInt(req.params.id);
    const download = req.query.download === "true";

    if (!quotationId || isNaN(quotationId)) {
      return res.status(400).json({ error: "ID de cotización inválido" });
    }

    const quotation = await db.getQuotationById(quotationId);
    if (!quotation) return res.status(404).json({ error: "Cotización no encontrada" });

    const client = await db.getClientById(quotation.clientId);
    if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

    // ── MODO DESCARGA DIRECTA (sin S3) ──────────────────────────────────────
    if (download) {
      console.log(`[PDF] Descarga directa para cotización ${quotationId}`);
      const { buffer, pdfPath: generatedPath } = await buildPDFBuffer(quotation, client, quotationId);
      pdfPath = generatedPath;

      const filename = `${quotation.quotationNumber} - ${client.name}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);

      // Intentar guardar en S3 en segundo plano (no bloqueante)
      setImmediate(async () => {
        try {
          const s3Key = `quotations/${client.id}/${quotationId}/v${quotation.versionNumber || 1}.pdf`;
          const { url: pdfUrl } = await storagePut(s3Key, buffer, "application/pdf");
          await db.updateQuotation(quotationId, { pdfUrl });
          console.log(`[PDF] PDF guardado en S3 en segundo plano: ${pdfUrl}`);
        } catch (s3Err: any) {
          console.warn(`[PDF] S3 no disponible, PDF no guardado en nube: ${s3Err?.message}`);
        } finally {
          if (pdfPath && existsSync(pdfPath)) {
            try { unlinkSync(pdfPath); } catch {}
          }
        }
      });

      return; // Respuesta ya enviada
    }

    // ── MODO VISUALIZACIÓN (intenta S3, fallback a stream) ──────────────────
    // Si ya hay URL en S3, redirigir
    if (quotation.pdfUrl) {
      try {
        const fileExists = await checkFileExistsInS3(quotation.pdfUrl);
        if (fileExists) {
          const presignedUrl = await getPresignedS3Url(quotation.pdfUrl, 3600);
          console.log(`[PDF] Redirigiendo a S3 para cotización ${quotationId}`);
          return res.redirect(presignedUrl);
        }
      } catch (s3Err: any) {
        console.warn(`[PDF] Error accediendo S3, generando directo: ${s3Err?.message}`);
      }
    }

    // Fallback: generar y enviar inline
    console.log(`[PDF] Generando PDF inline para cotización ${quotationId}`);
    const { buffer, pdfPath: generatedPath } = await buildPDFBuffer(quotation, client, quotationId);
    pdfPath = generatedPath;

    const filename = `${quotation.quotationNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);

    // Intentar guardar en S3 en segundo plano
    setImmediate(async () => {
      try {
        const s3Key = `quotations/${client.id}/${quotationId}/v${quotation.versionNumber || 1}.pdf`;
        const { url: pdfUrl } = await storagePut(s3Key, buffer, "application/pdf");
        await db.updateQuotation(quotationId, { pdfUrl });
        console.log(`[PDF] PDF guardado en S3 en segundo plano: ${pdfUrl}`);
      } catch (s3Err: any) {
        console.warn(`[PDF] S3 no disponible, PDF no persistido: ${s3Err?.message}`);
      } finally {
        if (pdfPath && existsSync(pdfPath)) {
          try { unlinkSync(pdfPath); } catch {}
        }
      }
    });

  } catch (error: any) {
    console.error(`[PDF] Error sirviendo PDF:`, error?.message);

    // Limpiar temp si quedó
    if (pdfPath && existsSync(pdfPath)) {
      try { unlinkSync(pdfPath); } catch {}
    }

    if (!res.headersSent) {
      res.status(500).json({ error: "Error generando PDF", details: error?.message });
    }
  }
});

export default router;
