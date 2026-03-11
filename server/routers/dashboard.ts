import { router, protectedProcedure } from "../_core/trpc";
import { getGlobalFinancialDashboard, getCashFlowData, getCEOFinancialMetrics } from "../db";

// Tipo para los datos financieros del dashboard
interface DashboardFinancialData {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  cashFlow: any[];
}

// Tipo para las métricas del Panel CEO
interface CEOFinancialMetrics {
  ingresosRecibidos: number;
  totalVendido: number;
  porCobrar: number;
  gastos: number;
  margen: number;
  rentabilidad: number;
}

export const dashboardRouter = router({
  getGlobalDashboard: protectedProcedure
    .query(async ({ ctx }): Promise<DashboardFinancialData> => {
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

  getCEOMetrics: protectedProcedure
    .query(async ({ ctx }): Promise<CEOFinancialMetrics> => {
      // Verificar permisos
      if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
        throw new Error("FORBIDDEN");
      }

      // Obtener métricas del Panel CEO
      const metrics = await getCEOFinancialMetrics();
      return metrics;
    }),
});
