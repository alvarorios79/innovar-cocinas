import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
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
});
