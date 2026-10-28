import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getFinancialSettings, updateFinancialSettings, getFixedExpenseConfig, upsertFixedExpenseConfig } from "../db";

export const financialSettingsRouter = router({
  get: protectedProcedure.query(async () => {
    try {
      const settings = await getFinancialSettings();
      return settings;
    } catch (error) {
      console.error("[financialSettings.get] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch financial settings",
      });
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        outstandingThresholdPercent: z.number().min(0).max(100).optional(),
        collectionThresholdPercent: z.number().min(0).max(100).optional(),
        lowProfitThresholdPercent: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super_admin can update financial settings",
        });
      }
      try {
        const current = await getFinancialSettings();
        const settingsId = current?.id ?? 1;
        const updated = await updateFinancialSettings(settingsId, input);
        return updated;
      } catch (error) {
        console.error("[financialSettings.update] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update financial settings",
        });
      }
    }),

  getFixedExpenses: protectedProcedure.query(async () => {
    try {
      return await getFixedExpenseConfig();
    } catch (error) {
      console.error("[financialSettings.getFixedExpenses] Error:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error obteniendo gastos fijos" });
    }
  }),

  updateFixedExpenses: protectedProcedure
    .input(
      z.array(
        z.object({
          concept: z.string().min(1),
          monthlyAmount: z.number().min(0),
          sortOrder: z.number(),
          notes: z.string().nullable().optional(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo super_admin puede modificar gastos fijos" });
      }
      try {
        await upsertFixedExpenseConfig(input);
        return { success: true };
      } catch (error) {
        console.error("[financialSettings.updateFixedExpenses] Error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error guardando gastos fijos" });
      }
    }),
});
