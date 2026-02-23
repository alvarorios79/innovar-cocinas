import { router, protectedProcedure } from "../_core/trpc";
import { getGlobalFinancialDashboard, getCashFlowData } from "../db";

export const dashboardRouter = router({
  getGlobalDashboard: protectedProcedure.query(async ({ ctx }) => {
    // Verificar permisos
    if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    // Obtener datos del dashboard
    const financialData = await getGlobalFinancialDashboard();
    const cashFlowData = await getCashFlowData();

    return {
      ...financialData,
      cashFlow: cashFlowData,
    };
  }),
});
