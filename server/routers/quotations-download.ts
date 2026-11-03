import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { buildQuotationPdfData } from "../quotation-pdf-data";

export const quotationsDownloadRouter = router({
  // Descargar PDF de cotización
  downloadPDF: protectedProcedure
    .input(z.object({
      quotationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Obtener la cotización
      const quotation = await db.getQuotationById(input.quotationId);
      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
      }

      // Verificar permisos: el cliente solo puede descargar sus propias cotizaciones
      const client = await db.getClientByUserId(ctx.user.id);
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "comercial";
      
      if (!isAdmin && (!client || quotation.clientId !== client.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para descargar esta cotización" });
      }

      try {
        // Obtener items de la cotización
        const items = await db.getQuotationItems(input.quotationId);
        
        // Obtener datos del cliente
        const clientData = await db.getClientById(quotation.clientId);
        
        // Preparar datos para el PDF
        const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
        
        const pdfData = await buildQuotationPdfData(quotation, clientData, items);

        // Generar PDF
        const { generateQuotationPDF } = await import('../quotation-pdf-generator');
        // @ts-ignore
        const result = await generateQuotationPDF(pdfData, quotation.id);
        
        // Leer el PDF generado
        const fs = await import('fs');
        const pdfBuffer = fs.readFileSync(result.pdfPath);
        
        // Limpiar archivo temporal
        fs.unlinkSync(result.pdfPath);

        // Retornar el PDF como base64 para que el cliente lo descargue
        const base64PDF = pdfBuffer.toString('base64');
        const fileName = `${quotation.quotationNumber} - ${quotation.vendorName}.pdf`;

        return {
          success: true,
          pdf: base64PDF,
          fileName: fileName,
          mimeType: 'application/pdf',
        };
      } catch (error: any) {
        console.error('Error generando PDF de cotización:', error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: error.message || "Error generando PDF de cotización" 
        });
      }
    }),

  // Descarga pública por token — genera PDF fresco idéntico al del CRM
  downloadPDFByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const drizzleDb = await db.getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { quotations: qTable } = await import("../../drizzle/schema");
      const { eq, and, isNull } = await import("drizzle-orm");

      const rows = await drizzleDb
        .select()
        .from(qTable)
        .where(and(eq((qTable as any).publicToken, input.token), isNull(qTable.deletedAt)))
        .limit(1);

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enlace no válido o expirado" });
      }

      const quotation = rows[0];

      try {
        const items = await db.getQuotationItems(quotation.id);
        const clientData = await db.getClientById(quotation.clientId);

        const formatCurrency = (value: number) =>
          new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

        const pdfData = await buildQuotationPdfData(quotation, clientData, items);

        const { generateQuotationPDF } = await import('../quotation-pdf-generator');
        // @ts-ignore
        const result = await generateQuotationPDF(pdfData, quotation.id);

        const fs = await import('fs');
        const pdfBuffer = fs.readFileSync(result.pdfPath);
        fs.unlinkSync(result.pdfPath);

        return {
          success: true,
          pdf: pdfBuffer.toString('base64'),
          fileName: `${quotation.quotationNumber}.pdf`,
          mimeType: 'application/pdf',
        };
      } catch (error: any) {
        console.error('[downloadPDFByToken] Error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error generando PDF",
        });
      }
    }),
});
