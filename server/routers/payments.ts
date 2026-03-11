import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

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
        receivedAt: input.receivedAt instanceof Date ? input.receivedAt.toISOString().slice(0, 19).replace('T', ' ') : input.receivedAt,
        method: input.method || null,
        movementType: input.movementType || "payment",
        notes: input.notes || null,
        registeredBy: ctx.user.id,
      });

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
