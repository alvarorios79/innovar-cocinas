import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getFinancialSettings, updateFinancialSettings } from "../db";

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
      // Only super_admin can update
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super_admin can update financial settings",
        });
      }

      try {
        const updated = await updateFinancialSettings(input);
        return updated;
      } catch (error) {
        console.error("[financialSettings.update] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update financial settings",
        });
      }
    }),
});
