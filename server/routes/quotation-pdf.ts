import { Router, Request, Response } from "express";
import * as db from "../db";
import { storagePut } from "../storage";
import { generateQuotationPDF } from "../quotation-pdf-generator";
import { readFileSync, unlinkSync, existsSync, statSync } from "fs";
import { buildQuotationPdfData } from "../quotation-pdf-data";

const router = Router();

/**
 * Genera el buffer del PDF para una cotización dada.
 * Reutilizable tanto para descarga directa como para subida a S3.
 */
async function buildPDFBuffer(quotation: any, client: any, quotationId: number): Promise<{ buffer: Buffer; pdfPath: string }> {
  const quotationItems = await db.getQuotationItems(quotationId);

  const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(Number(value));

  const pdfData = await buildQuotationPdfData(quotation, client, quotationItems);

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
    // Siempre se genera el PDF fresco (mismo generador que el CRM): así todos ven el mismo PDF.
    // Ya no se entrega el PDF viejo guardado en S3.

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
