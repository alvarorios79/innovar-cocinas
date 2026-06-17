import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { TrendingUp, DollarSign, Zap, Target, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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
    ingresoPromedioPorProyecto: 0,
    carteraPendientePorProyecto: 0,
  });

  // Obtener datos financieros del backend
  const { data: dashboardData, isLoading } = trpc.dashboard.getGlobalDashboard.useQuery();
  
  // Obtener número de proyectos con pagos en el mes actual
  const { data: monthlyProjectsCount = 0 } = trpc.dashboard.getMonthlyProjectsCount.useQuery();

  // Obtener métricas CEO que incluyen porCobrar
  const { data: ceoMetrics } = trpc.dashboard.getCEOMetrics.useQuery();

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

    // Calcular ingreso promedio por proyecto
    const ingresoPromedioPorProyecto = monthlyProjectsCount > 0 ? ingresos / monthlyProjectsCount : 0;

    // Calcular cartera pendiente por proyecto
    const porCobrar = ceoMetrics?.porCobrar || 0;
    const carteraPendientePorProyecto = monthlyProjectsCount > 0 ? porCobrar / monthlyProjectsCount : 0;

    setCurrentMonthMetrics({
      ingresos,
      gastos,
      margen,
      rentabilidadPromedio: ingresos > 0 ? (margen / ingresos) * 100 : 0,
      totalProyectos: monthlyProjectsCount, // Dato real del backend
      ingresoPromedioPorProyecto, // Cálculo: ingresos / proyectos
      carteraPendientePorProyecto, // Cálculo: porCobrar / proyectos
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
  }, [dashboardData, monthlyProjectsCount, ceoMetrics]);

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
    <div className="pb-20 md:pb-0">
      <div>
        <Breadcrumbs
          items={[
            { label: "Panel Admin", href: "/admin" },
            { label: "Rentabilidad" },
          ]}
        />
        <PageHeader
          title="📊 Dashboard de Rentabilidad"
          subtitle="Análisis financiero del mes actual y últimos 6 meses"
          showBack={true}
        />

      {/* KPI Cards */}
      <KpiGrid cols={4} className="mb-8">
        <KpiCard
          label="Ingresos del Mes"
          value={formatPrice(currentMonthMetrics.ingresos)}
          helper={`${currentMonthMetrics.totalProyectos} proyectos`}
          icon={<DollarSign className="h-4 w-4" />}
          accent="#22C55E"
        />
        <KpiCard
          label="Gastos del Mes"
          value={formatPrice(currentMonthMetrics.gastos)}
          helper={`${Math.round((currentMonthMetrics.gastos / currentMonthMetrics.ingresos) * 100 || 0)}% de ingresos`}
          icon={<Zap className="h-4 w-4" />}
          accent="#EF4444"
        />
        <KpiCard
          label="Margen del Mes"
          value={formatPrice(currentMonthMetrics.margen)}
          helper={`${Math.round((currentMonthMetrics.margen / currentMonthMetrics.ingresos) * 100 || 0)}% margen`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="#3B82F6"
        />
        <KpiCard
          label="Rentabilidad Prom."
          value={`${currentMonthMetrics.rentabilidadPromedio.toFixed(1)}%`}
          helper="Promedio de proyectos"
          icon={<Target className="h-4 w-4" />}
          accent="#F59E0B"
        />
        <KpiCard
          label="Proyectos del Mes"
          value={currentMonthMetrics.totalProyectos}
          helper="Proyectos creados"
          icon={<Calendar className="h-4 w-4" />}
          accent="#A78BFA"
        />
        <KpiCard
          label="Ingreso Promedio"
          value={formatPrice(currentMonthMetrics.ingresoPromedioPorProyecto)}
          helper="Por proyecto"
          icon={<DollarSign className="h-4 w-4" />}
          accent="#6366F1"
        />
        <KpiCard
          label="Cartera Pendiente"
          value={formatPrice(currentMonthMetrics.carteraPendientePorProyecto)}
          helper="Por cobrar por proyecto"
          icon={<DollarSign className="h-4 w-4" />}
          accent="#F97316"
        />
      </KpiGrid>

      {/* Gráfico de Ingresos vs Gastos */}
      <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-[#162828] mb-8">
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
                    <span className="text-sm font-medium text-white/85">
                      {monthNames[month.month]} {month.year}
                    </span>
                    <span className="text-xs text-white/45">
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
                  <div className="flex justify-between text-xs text-white/60">
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
      <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-[#162828]">
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
                  <tr className="border-b border-[rgba(106,207,199,0.12)]">
                    <th className="text-left py-2 px-3 font-semibold text-white/85">
                      Mes
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-white/85">
                      Ingresos
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-white/85">
                      Gastos
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-white/85">
                      Margen
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-white/85">
                      Rentabilidad
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-white/85">
                      Proyectos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((month, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[rgba(106,207,199,0.08)] hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-white/85">
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
                      <td className="text-right py-3 px-3 text-white/85">
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
