import { Router, Request, Response } from "express";
import * as db from "../db";
import { storagePut, storageGet } from "../storage";

const router = Router();

/**
 * GET /api/quotations/pdf/:id
 * Servir PDF de cotización
 * ?download=true para descargar, sin parámetro para ver en navegador
 */
router.get("/quotations/pdf/:id", async (req: Request, res: Response) => {
  try {
    const quotationId = parseInt(req.params.id);
    const download = req.query.download === "true";

    if (!quotationId) {
      return res.status(400).json({ error: "ID de cotización inválido" });
    }

    // Obtener cotización
    const quotation = await db.getQuotationById(quotationId);
    if (!quotation) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }

    // Obtener cliente
    const client = await db.getClientById(quotation.clientId);
    if (!client) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    // Si existe pdfUrl, descargar desde S3
    if (quotation.pdfUrl) {
      try {
        const presignedUrl = await storageGet(quotation.pdfUrl);
        const response = await fetch(presignedUrl.url);
        const pdfBuffer = await response.arrayBuffer();

        // Configurar headers
        const fileName = `${quotation.quotationNumber}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        
        if (download) {
          res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        } else {
          res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
        }

        res.setHeader("Content-Length", pdfBuffer.byteLength);
        res.send(Buffer.from(pdfBuffer));
      } catch (error) {
        console.error("Error obteniendo PDF de S3:", error);
        res.status(500).json({ error: "Error obteniendo PDF" });
      }
    } else {
      res.status(404).json({ error: "PDF no disponible" });
    }
  } catch (error) {
    console.error("Error sirviendo PDF:", error);
    res.status(500).json({ error: "Error sirviendo PDF" });
  }
});

export default router;
