import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

/**
 * Calcular saldo pendiente del proyecto
 * Saldo = Total - Pagos - Descuentos + Recargos
 */
async function calculateProjectBalance(projectId: number) {
  const payments = await db.getPaymentsByProjectId(projectId);
  const project = await db.getProjectById(projectId);
  
  if (!project) return 0;
  
  let totalPayments = 0;
  let totalDiscounts = 0;
  let totalSurcharges = 0;
  
  for (const payment of payments) {
    const amount = parseFloat(payment.amount as any);
    const movementType = (payment as any).movementType || "payment";
    
    if (movementType === "payment") {
      totalPayments += amount;
    } else if (movementType === "discount") {
      totalDiscounts += amount;
    } else if (movementType === "surcharge") {
      totalSurcharges += amount;
    }
  }
  
  const projectTotal = parseFloat(project.totalAmount as any) || 0;
  const balance = projectTotal + totalSurcharges - totalDiscounts - totalPayments;
  
  return Math.max(0, balance);
}

export const paymentsRouter = router({
  /**
   * Create a new payment/movement for a project
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        amount: z.number().positive(),
        type: z.enum(["advance", "final", "partial", "other"]),
        movementType: z.enum(["payment", "discount", "surcharge"]).default("payment"),
        receivedAt: z.date(),
        method: z.string().optional(),
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

      // Insert payment/movement
      const paymentId = await db.createPayment({
        projectId: input.projectId,
        amount: input.amount.toString(),
        type: input.type,
        movementType: input.movementType,
        receivedAt: input.receivedAt,
        method: input.method || null,
        notes: input.notes || null,
        registeredBy: ctx.user.id,
      });

      const movementLabel = input.movementType === "payment" ? "Pago" : 
                           input.movementType === "discount" ? "Descuento" : "Recargo";
      return { id: paymentId, message: `${movementLabel} registrado exitosamente` };
    }),

  /**
   * Get all movements for a specific project
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

      return await db.getPaymentsByProjectId(input.projectId);
    }),

  /**
   * Get project balance (total - payments - discounts + surcharges)
   */
  getProjectBalance: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proyecto no encontrado",
        });
      }

      const balance = await calculateProjectBalance(input.projectId);
      const projectTotal = parseFloat(project.totalAmount as any) || 0;
      
      return {
        projectTotal,
        balance,
        projectId: input.projectId,
      };
    }),

  /**
   * Delete a movement (admin/super_admin only)
   */
  delete: adminProcedure
    .input(z.object({ paymentId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      // Validate payment exists
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Movimiento no encontrado",
        });
      }

      await db.deletePayment(input.paymentId);
      return { message: "Movimiento eliminado exitosamente" };
    }),
});
