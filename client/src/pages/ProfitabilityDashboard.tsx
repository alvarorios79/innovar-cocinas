import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { TrendingUp, DollarSign, Zap, Target, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";

interface MonthlyMetrics {
  month: number;
  year: number;
  ingresos: number;
  gastos: number;
  margen: number;
  proyectos: number;
  rentabilidadPromedio: number;
}

export default function ProfitabilityDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyMetrics[]>([]);
  const [currentMonthMetrics, setCurrentMonthMetrics] = useState({
    ingresos: 0,
    gastos: 0,
    margen: 0,
    rentabilidadPromedio: 0,
    totalProyectos: 0,
  });

  // Obtener datos financieros del backend
  const { data: dashboardData, isLoading } = trpc.dashboard.getGlobalDashboard.useQuery();
  
  // Obtener número de proyectos con pagos en el mes actual
  const { data: monthlyProjectsCount = 0 } = trpc.dashboard.getMonthlyProjectsCount.useQuery();

  // Calcular métricas cuando cambian los datos del dashboard
  useEffect(() => {
    if (!dashboardData) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Usar datos del backend directamente
    const ingresos = dashboardData.totalRevenue || 0;
    const gastos = dashboardData.totalExpenses || 0;
    const margen = dashboardData.balance || 0;

    setCurrentMonthMetrics({
      ingresos,
      gastos,
      margen,
      rentabilidadPromedio: ingresos > 0 ? (margen / ingresos) * 100 : 0,
      totalProyectos: monthlyProjectsCount, // Dato real del backend
    });

    // Calcular últimos 6 meses (datos agregados)
    const last6Months: MonthlyMetrics[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      // Por ahora mostrar datos del mes actual en todos los meses
      // En una implementación futura se podría obtener datos históricos del backend
      last6Months.push({
        month,
        year,
        ingresos: i === 0 ? ingresos : 0,
        gastos: i === 0 ? gastos : 0,
        margen: i === 0 ? margen : 0,
        proyectos: i === 0 ? monthlyProjectsCount : 0,
        rentabilidadPromedio: i === 0 ? (ingresos > 0 ? (margen / ingresos) * 100 : 0) : 0,
      });
    }

    setMonthlyData(last6Months);
  }, [dashboardData, monthlyProjectsCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "super_admin")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">
          No tienes permiso para acceder a este dashboard
        </p>
      </div>
    );
  }

  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  // Encontrar máximo para escalar el gráfico
  const maxValue = Math.max(
    ...monthlyData.map((m) => Math.max(m.ingresos, m.gastos))
  );
  const scale = maxValue > 0 ? 100 / maxValue : 1;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="📊 Dashboard de Rentabilidad"
          subtitle="Análisis financiero del mes actual y últimos 6 meses"
          showBack={false}
        />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Ingresos */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(currentMonthMetrics.ingresos)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentMonthMetrics.totalProyectos} proyectos
            </p>
          </CardContent>
        </Card>

          {/* Gastos */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                Gastos del Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(currentMonthMetrics.gastos)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {Math.round(
                  (currentMonthMetrics.gastos / currentMonthMetrics.ingresos) *
                    100 || 0
                )}
                % de ingresos
              </p>
            </CardContent>
          </Card>

          {/* Margen */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Margen del Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(currentMonthMetrics.margen)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {Math.round(
                  (currentMonthMetrics.margen / currentMonthMetrics.ingresos) *
                    100 || 0
                )}
                % margen
              </p>
            </CardContent>
          </Card>

          {/* Rentabilidad Promedio */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Rentabilidad Prom.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {currentMonthMetrics.rentabilidadPromedio.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Promedio de proyectos
              </p>
            </CardContent>
          </Card>

        {/* Proyectos del Mes */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              Proyectos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {currentMonthMetrics.totalProyectos}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Proyectos creados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Ingresos vs Gastos */}
      <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Ingresos vs Gastos - Últimos 6 Meses</CardTitle>
          <CardDescription>
            Comparativa de ingresos y gastos por mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((month, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">
                      {monthNames[month.month]} {month.year}
                    </span>
                    <span className="text-xs text-slate-500">
                      {month.proyectos} proyectos
                    </span>
                  </div>

                  {/* Barras de Ingresos y Gastos */}
                  <div className="flex gap-2 h-8">
                    {/* Ingresos */}
                    <div className="flex-1 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded transition-all"
                        style={{
                          width: `${Math.min(100, (month.ingresos * scale) / 100)}%`,
                        }}
                        title={`Ingresos: ${formatPrice(month.ingresos)}`}
                      />
                    </div>

                    {/* Gastos */}
                    <div className="flex-1 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="bg-red-500 h-full rounded transition-all"
                        style={{
                          width: `${Math.min(100, (month.gastos * scale) / 100)}%`,
                        }}
                        title={`Gastos: ${formatPrice(month.gastos)}`}
                      />
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>
                      Ingresos: <strong>{formatPrice(month.ingresos)}</strong>
                    </span>
                    <span>
                      Gastos: <strong>{formatPrice(month.gastos)}</strong>
                    </span>
                    <span>
                      Margen:{" "}
                      <strong
                        className={
                          month.margen >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {formatPrice(month.margen)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      {/* Tabla de Rentabilidad por Mes */}
      <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Resumen Mensual</CardTitle>
          <CardDescription>
            Métricas financieras agregadas por mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">
                      Mes
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">
                      Ingresos
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">
                      Gastos
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">
                      Margen
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">
                      Rentabilidad
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">
                      Proyectos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((month, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {monthNames[month.month]} {month.year}
                      </td>
                      <td className="text-right py-3 px-3 text-green-600 font-semibold">
                        {formatPrice(month.ingresos)}
                      </td>
                      <td className="text-right py-3 px-3 text-red-600 font-semibold">
                        {formatPrice(month.gastos)}
                      </td>
                      <td
                        className={`text-right py-3 px-3 font-semibold ${
                          month.margen >= 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatPrice(month.margen)}
                      </td>
                      <td className="text-right py-3 px-3">
                        <Badge
                          variant={
                            month.rentabilidadPromedio > 20
                              ? "default"
                              : month.rentabilidadPromedio > 10
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {month.rentabilidadPromedio.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-3 text-slate-700">
                        {month.proyectos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
