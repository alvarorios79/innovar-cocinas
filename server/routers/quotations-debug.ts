import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import * as whatsappCloud from "../whatsapp-cloud";

// 🔴 ROUTER TEMPORAL PARA DIAGNÓSTICO DE WHATSAPP
// REMOVER DESPUÉS DE COMPLETAR DIAGNÓSTICO
// NO USAR EN PRODUCCIÓN

export function createQuotationsDebugRouter() {
  return router({
    // Endpoint temporal: Enviar cotización a 3 destinos para diagnóstico
    sendByWhatsAppDebug: protectedProcedure
      .input(z.object({ quotationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin puede usar este endpoint
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo super_admin puede usar este endpoint de diagnóstico"
          });
        }

        console.log("[WHATSAPP DEBUG] Iniciando diagnóstico de envío a 3 destinos");
        console.log("[WHATSAPP DEBUG] Quotation ID:", input.quotationId);

        // Obtener cotización
        const quotation = await db.getQuotationById(input.quotationId);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        }

        console.log("[WHATSAPP DEBUG] Cotización encontrada:", {
          id: quotation.id,
          number: quotation.quotationNumber,
          clientId: quotation.clientId
        });

        // Obtener cliente original
        const clientOriginal = await db.getClientById(quotation.clientId);
        if (!clientOriginal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente original no encontrado" });
        }

        if (!clientOriginal.whatsappPhone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente original sin teléfono WhatsApp registrado"
          });
        }

        console.log("[WHATSAPP DEBUG] Cliente original:", {
          id: clientOriginal.id,
          name: clientOriginal.name,
          phone: clientOriginal.whatsappPhone
        });

        // Obtener super_admin
        const allUsers = await db.getAllUsers();
        const superAdminUser = allUsers.find((u: any) => u.role === "super_admin");

        if (!superAdminUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No hay usuario super_admin registrado en el sistema"
          });
        }

        console.log("[WHATSAPP DEBUG] Super_admin encontrado:", {
          id: superAdminUser.id,
          name: superAdminUser.name,
          phone: superAdminUser.phone || "sin teléfono"
        });

        // Obtener cliente "Álvaro pruebas"
        const allClients = await db.getAllClients();
        const alvaroPruebasClient = allClients.find((c: any) => c.name === "Álvaro pruebas");

        if (!alvaroPruebasClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente 'Álvaro pruebas' no encontrado"
          });
        }

        if (!alvaroPruebasClient.whatsappPhone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente 'Álvaro pruebas' sin teléfono WhatsApp"
          });
        }

        console.log("[WHATSAPP DEBUG] Cliente Álvaro pruebas encontrado:", {
          id: alvaroPruebasClient.id,
          name: alvaroPruebasClient.name,
          phone: alvaroPruebasClient.whatsappPhone
        });

        const results: any = {
          clienteOriginal: null,
          superAdmin: null,
          alvaroPruebas: null,
          pdfUrl: null
        };

        try {
          // Generar PDF (reutilizar lógica del endpoint principal)
          console.log("[WHATSAPP DEBUG] Generando PDF...");

          const pdfData: any = {
            quotationNumber: quotation.quotationNumber,
            date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
            clientName: clientOriginal.name,
            clientEmail: clientOriginal.email || "",
            clientPhone: clientOriginal.whatsappPhone,
            items: (quotation as any).items || [],
            subtotal: quotation.subtotal || 0,
            discount: (quotation as any).discount || 0,
            tax: (quotation as any).tax || 0,
            total: quotation.total || 0,
            notes: (quotation as any).notes || "",
            validUntil: quotation.validUntil,
            vendorName: "INNOVAR Cocinas",
            productType: "Cocina Integral",
            transportCost: 0
          };

          const { generateQuotationPDF } = await import('../quotation-pdf-generator');
          const pdfResult = await generateQuotationPDF(pdfData, quotation.id);

          console.log("[WHATSAPP DEBUG] PDF generado en:", pdfResult.pdfPath);

          const fs = await import('fs');
          const pdfBuffer = fs.readFileSync(pdfResult.pdfPath);

          console.log("[WHATSAPP DEBUG] Tamaño del PDF:", pdfBuffer.length, "bytes");

          const { storagePut } = await import('../storage');
          const pdfKey = `quotations/debug-${quotation.quotationNumber}-${Date.now()}.pdf`;
          const { url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, 'application/pdf');

          console.log("[WHATSAPP DEBUG] PDF subido a S3:", pdfUrl);

          fs.unlinkSync(pdfResult.pdfPath);

          results.pdfUrl = pdfUrl;

          // Mensaje formal
          const validUntilDate = quotation.validUntil
            ? new Date(quotation.validUntil).toLocaleDateString('es-CO')
            : 'sin especificar';

          const formalMessage = `[TEST DEBUG] Hola ${clientOriginal.name}\n\nGracias por confiar en INNOVAR Cocinas de Diseño.\n\nTe compartimos la cotización ${quotation.quotationNumber}.\nEn el documento encontrarás especificaciones técnicas, materiales y valor total del proyecto.\n\nLa propuesta tiene una vigencia hasta ${validUntilDate}.\n\nQuedamos atentos para cualquier ajuste o para avanzar con tu proyecto`;

          // 1️⃣ Enviar al cliente original
          console.log("[WHATSAPP DEBUG] Enviando a cliente original:", clientOriginal.whatsappPhone);

          const textResp1 = await whatsappCloud.sendTextMessage(
            clientOriginal.whatsappPhone,
            formalMessage
          );

          console.log("[WHATSAPP DEBUG] Respuesta texto cliente original:", {
            success: textResp1.success,
            status: (textResp1 as any).status,
            messageId: (textResp1 as any).messageId,
            error: textResp1.error
          });

          await new Promise(resolve => setTimeout(resolve, 1000));

          const pdfResp1 = await whatsappCloud.sendDocumentMessage(
            clientOriginal.whatsappPhone,
            pdfUrl,
            `Cotizacion-${quotation.quotationNumber}.pdf`,
            "Cotización oficial INNOVAR Cocinas"
          );

          console.log("[WHATSAPP DEBUG] Respuesta PDF cliente original:", {
            success: pdfResp1.success,
            status: (pdfResp1 as any).status,
            messageId: (pdfResp1 as any).messageId,
            error: pdfResp1.error
          });

          results.clienteOriginal = {
            phone: clientOriginal.whatsappPhone,
            textSuccess: textResp1.success,
            textStatus: (textResp1 as any).status || "unknown",
            textMessageId: (textResp1 as any).messageId,
            textError: textResp1.error,
            pdfSuccess: pdfResp1.success,
            pdfStatus: (pdfResp1 as any).status || "unknown",
            pdfMessageId: (pdfResp1 as any).messageId,
            pdfError: pdfResp1.error
          };

          // 2️⃣ Enviar al super_admin (si tiene teléfono)
          if (superAdminUser.phone) {
            console.log("[WHATSAPP DEBUG] Enviando a super_admin:", superAdminUser.phone);

            const textResp2 = await whatsappCloud.sendTextMessage(
              superAdminUser.phone,
              `[TEST SUPER_ADMIN] ${formalMessage}`
            );

            console.log("[WHATSAPP DEBUG] Respuesta texto super_admin:", {
              success: textResp2.success,
              status: (textResp2 as any).status,
              messageId: (textResp2 as any).messageId,
              error: textResp2.error
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            const pdfResp2 = await whatsappCloud.sendDocumentMessage(
              superAdminUser.phone,
              pdfUrl,
              `Cotizacion-${quotation.quotationNumber}-ADMIN.pdf`,
              "[TEST] Cotización oficial INNOVAR Cocinas"
            );

            console.log("[WHATSAPP DEBUG] Respuesta PDF super_admin:", {
              success: pdfResp2.success,
              status: (pdfResp2 as any).status,
              messageId: (pdfResp2 as any).messageId,
              error: pdfResp2.error
            });

            results.superAdmin = {
              phone: superAdminUser.phone,
              textSuccess: textResp2.success,
              textStatus: (textResp2 as any).status || "unknown",
              textMessageId: (textResp2 as any).messageId,
              textError: textResp2.error,
              pdfSuccess: pdfResp2.success,
              pdfStatus: (pdfResp2 as any).status || "unknown",
              pdfMessageId: (pdfResp2 as any).messageId,
              pdfError: pdfResp2.error
            };
          } else {
            console.log("[WHATSAPP DEBUG] Super_admin sin teléfono registrado");
            results.superAdmin = { error: "Super_admin sin teléfono registrado" };
          }

          // 3️⃣ Enviar a Álvaro pruebas
          console.log("[WHATSAPP DEBUG] Enviando a Álvaro pruebas:", alvaroPruebasClient.whatsappPhone);

          const textResp3 = await whatsappCloud.sendTextMessage(
            alvaroPruebasClient.whatsappPhone,
            `[TEST ÁLVARO] ${formalMessage}`
          );

          console.log("[WHATSAPP DEBUG] Respuesta texto Álvaro pruebas:", {
            success: textResp3.success,
            status: (textResp3 as any).status,
            messageId: (textResp3 as any).messageId,
            error: textResp3.error
          });

          await new Promise(resolve => setTimeout(resolve, 1000));

          const pdfResp3 = await whatsappCloud.sendDocumentMessage(
            alvaroPruebasClient.whatsappPhone,
            pdfUrl,
            `Cotizacion-${quotation.quotationNumber}-ALVARO.pdf`,
            "[TEST] Cotización oficial INNOVAR Cocinas"
          );

          console.log("[WHATSAPP DEBUG] Respuesta PDF Álvaro pruebas:", {
            success: pdfResp3.success,
            status: (pdfResp3 as any).status,
            messageId: (pdfResp3 as any).messageId,
            error: pdfResp3.error
          });

          results.alvaroPruebas = {
            phone: alvaroPruebasClient.whatsappPhone,
            textSuccess: textResp3.success,
            textStatus: (textResp3 as any).status || "unknown",
            textMessageId: (textResp3 as any).messageId,
            textError: textResp3.error,
            pdfSuccess: pdfResp3.success,
            pdfStatus: (pdfResp3 as any).status || "unknown",
            pdfMessageId: (pdfResp3 as any).messageId,
            pdfError: pdfResp3.error
          };

          console.log("[WHATSAPP DEBUG] Diagnóstico completado. Resultados finales:", JSON.stringify(results, null, 2));

          return {
            success: true,
            message: "Diagnóstico completado. Revisar logs del servidor.",
            results
          };
        } catch (error: any) {
          console.error('[WHATSAPP DEBUG] Error en diagnóstico:', error);
          console.error('[WHATSAPP DEBUG] Stack trace:', error.stack);

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error en diagnóstico: ${error.message}`
          });
        }
      })
  });
}

export const quotationsDebugRouter = createQuotationsDebugRouter();
