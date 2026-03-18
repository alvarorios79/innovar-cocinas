import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

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
        
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
          clientName: clientData?.name || 'Cliente',
          clientPhone: clientData?.whatsappPhone || undefined,
          clientAddress: clientData?.address || undefined,
          clientEmail: clientData?.email || undefined,
          vendorName: quotation.vendorName,
          productType: quotation.productType,
          validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
          items: items.map(item => ({
            itemNumber: item.itemNumber,
            description: item.description,
            quantity: item.quantity.toString(),
            totalPrice: formatCurrency(Number(item.totalPrice)),
          })),
          subtotal: formatCurrency(Number(quotation.subtotal)),
          discountAmount: formatCurrency(Number(quotation.discountAmount || 0)),
          discountPercent: quotation.discountPercent ? `${quotation.discountPercent}%` : '0%',
          transportCost: formatCurrency(Number(quotation.transportCost || 0)),
          total: formatCurrency(Number(quotation.total)),
          notes: (quotation as any).notes || "",
        };

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
});
