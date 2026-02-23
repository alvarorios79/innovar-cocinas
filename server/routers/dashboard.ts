import { router, protectedProcedure } from "../_core/trpc";
import { getGlobalFinancialDashboard } from "../db";

export const dashboardRouter = router({
  getGlobalDashboard: protectedProcedure.query(async ({ ctx }) => {
    // Verificar permisos
    if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    // Obtener datos del dashboard
    const result = await getGlobalFinancialDashboard();
    return result;
  }),
});
