import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { generateReceiptPDF } from "../receipt-pdf-generator";
import { generateAccountStatementPDF, AccountStatementData, MovementEntry } from "../account-statement-pdf-generator";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import * as whatsappCloud from "../whatsapp-cloud";

export const paymentsRouter = router({
  /**
   * Create a new payment for a project
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        amount: z.number().positive(),
        type: z.enum(["advance", "final", "partial", "other"]),
        receivedAt: z.date(),
        method: z.string().optional(),
        movementType: z.enum(["payment", "discount", "surcharge"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate project exists and is not soft-deleted
      const project = await db.getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proyecto no encontrado",
        });
      }

      // Insert payment
      const paymentId = await db.createPayment({
        projectId: input.projectId,
        amount: input.amount.toString(),
        type: input.type,
        receivedAt: input.receivedAt instanceof Date ? input.receivedAt.toISOString() : input.receivedAt,
        method: input.method || null,
        movementType: input.movementType || "payment",
        notes: input.notes || null,
        registeredBy: ctx.user.id,
      });

      // WhatsApp confirmación de pago al cliente (solo para pagos reales, no descuentos)
      const movType = input.movementType || "payment";
      if (movType === "payment" && whatsappCloud.isWhatsAppCloudConfigured()) {
        try {
          const client = await db.getClientById(project.clientId);
          if (client?.whatsappPhone) {
            const fmtCOP = (v: number) =>
              new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

            const msg =
              `✅ *¡Hola ${client.name}!*\n\n` +
              `Hemos registrado tu pago de *${fmtCOP(input.amount)}* para el proyecto *"${project.name}"*.\n\n` +
              `💳 Método: ${input.method || "No especificado"}\n` +
              (input.notes ? `📝 Nota: ${input.notes}\n\n` : "\n") +
              `Gracias por tu pago. Si tienes alguna consulta, contáctanos.\n\n` +
              `*INNOVAR Cocinas de Diseño*\n📞 313 680 2025`;

            await whatsappCloud.sendTextMessage(client.whatsappPhone, msg);
          }
        } catch (waError) {
          console.error("[WhatsApp] Error enviando confirmación de pago:", waError);
        }
      }

      return { id: paymentId, message: "Pago registrado exitosamente" };
    }),

  /**
   * Get all payments for a specific project
   */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      // Validate project exists
      const project = await db.getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proyecto no encontrado",
        });
      }

      return await db.getPaymentsByProject(input.projectId);
    }),


  /**
   * Get ALL payments across all projects (admin only)
   * Includes project name and client name via JOIN
   */
  getAll: adminProcedure
    .input(
      z.object({
        month: z.number().min(0).max(11).optional(), // 0-indexed
        year: z.number().optional(),
        projectId: z.number().int().positive().optional(),
        movementType: z.enum(["payment", "discount", "surcharge", "all"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.getAllPaymentsWithDetails({
        month: input.month,
        year: input.year,
        projectId: input.projectId,
        movementType: input.movementType === "all" ? undefined : input.movementType,
      });
    }),

  /**
   * Delete a payment (admin/super_admin only)
   */

  /**
   * Generar PDF de recibo de pago
   */
  generateReceipt: protectedProcedure
    .input(z.object({ paymentId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      }

      const project = await db.getProjectById(payment.projectId);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
      }

      const client = await db.getClientById(project.clientId);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Calcular totales pagados para este proyecto
      const allPayments = await db.getPaymentsByProject(payment.projectId);
      const totalPaid = allPayments
        .filter((p: any) => p.movementType === "payment" || !p.movementType)
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0);

      const thisAmount = parseFloat(payment.amount || "0");
      const previousPayments = totalPaid - thisAmount;
      const totalProject = parseFloat(project.totalAmount || "0");
      const balance = totalProject - totalPaid;

      // Formatear fecha del pago
      const paymentDateObj = new Date(payment.receivedAt);
      const paymentDate = paymentDateObj.toLocaleDateString("es-CO", {
        day: "numeric", month: "long", year: "numeric"
      });

      const year = paymentDateObj.getFullYear();
      const receiptNumber = `REC-${year}-${payment.id.toString().padStart(6, "0")}`;

      const typeLabels: Record<string, string> = {
        advance: "Adelanto",
        final: "Pago Final",
        partial: "Pago Parcial",
        other: "Otro",
      };
      const methodLabels: Record<string, string> = {
        transfer: "Transferencia",
        cash: "Efectivo",
        check: "Cheque",
        other: "Otro",
      };

      const outputPath = `/tmp/recibo_${payment.id}_${Date.now()}.pdf`;
      await generateReceiptPDF({
        receiptNumber,
        paymentDate,
        clientName: client.name,
        clientPhone: client.whatsappPhone || undefined,
        clientAddress: client.address || undefined,
        projectName: project.name,
        workType: project.workType || "",
        paymentType: typeLabels[payment.type] || payment.type,
        paymentMethod: methodLabels[payment.method || "other"] || payment.method || "No especificado",
        totalProject,
        previousPayments: Math.max(0, previousPayments),
        thisPayment: thisAmount,
        balance,
        notes: payment.notes || undefined,
      }, outputPath);

      const pdfBuffer = readFileSync(outputPath);
      const pdfBase64 = pdfBuffer.toString("base64");

      // Limpiar archivo temporal
      try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch {}

      const cleanClientName = client.name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]/g, "").replace(/\s+/g, "_");
      const filename = `${receiptNumber}_${cleanClientName}.pdf`;

      return { pdfBase64, filename, receiptNumber };
    }),

  delete: adminProcedure
    .input(z.object({ paymentId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      // Validate payment exists
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pago no encontrado",
        });
      }

      await db.deletePayment(input.paymentId);
      return { message: "Pago eliminado exitosamente" };
    }),

  /**
   * Generate account statement PDF for a project (all movements)
   */
  generateStatement: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
      }

      const client = await db.getClientById(project.clientId);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const allPayments = await db.getPaymentsByProject(input.projectId);

      // Build movements sorted by date
      const typeLabels: Record<string, Record<string, string>> = {
        payment:   { advance: "Anticipo", final: "Pago Final", partial: "Pago Parcial", other: "Otro Pago" },
        discount:  { advance: "Descuento", final: "Descuento", partial: "Descuento", other: "Descuento" },
        surcharge: { advance: "Recargo", final: "Recargo", partial: "Recargo", other: "Recargo" },
      };

      const methodLabel = (m: string | null) => {
        if (!m) return "—";
        const map: Record<string, string> = {
          transfer: "Transferencia", cash: "Efectivo",
          check: "Cheque", other: "Otro",
        };
        return map[m] || m;
      };

      const sorted = [...allPayments].sort((a, b) =>
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );

      const totalAgreed = parseFloat(String(project.totalAmount || 0));
      let balance = totalAgreed;
      let totalPaid = 0;
      let totalDiscounts = 0;
      let totalSurcharges = 0;

      const movements: MovementEntry[] = sorted.map((p, i) => {
        const amount = parseFloat(String(p.amount));
        const movType = p.movementType || "payment";
        const typeLabel = typeLabels[movType]?.[p.type] ?? p.type;

        if (movType === "payment") {
          balance -= amount;
          totalPaid += amount;
        } else if (movType === "discount") {
          balance -= amount;
          totalDiscounts += amount;
        } else if (movType === "surcharge") {
          balance += amount;
          totalSurcharges += amount;
        }

        const dateObj = new Date(p.receivedAt);
        const dateStr = dateObj.toLocaleDateString("es-CO", {
          day: "2-digit", month: "short", year: "numeric"
        });

        return {
          id: p.id,
          date: dateStr,
          typeLabel,
          method: methodLabel(p.method),
          amount,
          movementType: movType,
          notes: p.notes || undefined,
          runningBalance: balance,
        };
      });

      const today = new Date().toLocaleDateString("es-CO", {
        day: "2-digit", month: "long", year: "numeric"
      });

      const stmtData: AccountStatementData = {
        generatedDate: today,
        clientName: client.name,
        clientPhone: client.phone || client.whatsappPhone || undefined,
        clientAddress: client.address || undefined,
        projectName: project.name,
        workType: project.workType,
        totalAgreed,
        movements,
        totalPaid,
        totalDiscounts,
        totalSurcharges,
        finalBalance: balance,
      };

      const { tmpdir } = await import("os");
      const { join } = await import("path");
      const { readFileSync, unlinkSync, existsSync } = await import("fs");

      const outputPath = join(tmpdir(), `estado-cuenta-${input.projectId}-${Date.now()}.pdf`);
      await generateAccountStatementPDF(stmtData, outputPath);

      if (!existsSync(outputPath)) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error generando PDF" });
      }

      const pdfBuffer = readFileSync(outputPath);
      try { unlinkSync(outputPath); } catch { /* */ }

      return {
        base64: pdfBuffer.toString("base64"),
        filename: `estado-cuenta-${project.name.replace(/\s+/g, "-")}.pdf`,
      };
    }),

});
