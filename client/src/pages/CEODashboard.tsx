import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, DollarSign, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function CEODashboard() {
  const { data: dashboardData, isLoading, error } = trpc.dashboard.getGlobalDashboard.useQuery();

  // DEBUG LOGS
  useEffect(() => {
    console.log("Dashboard data:", dashboardData);
    console.log("Dashboard error:", error);
    console.log("Dashboard loading:", isLoading);
  }, [dashboardData, error, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center max-w-2xl">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-bold mb-4">Error al cargar el dashboard</p>
          <pre style={{
            backgroundColor: "#f3f4f6",
            padding: "16px",
            borderRadius: "8px",
            overflow: "auto",
            maxHeight: "400px",
            textAlign: "left",
            fontSize: "12px",
            color: "#dc2626",
            fontFamily: "monospace"
          }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // Usar solo los campos disponibles del backend
  const totalIngresos = Number(dashboardData?.totalRevenue) || 0;
  const totalGastos = Number(dashboardData?.totalExpenses) || 0;
  const margenGlobal = Number(dashboardData?.balance) || 0;
  
  // Calcular rentabilidad
  const rentabilidadPromedio = totalIngresos > 0 
    ? ((margenGlobal / totalIngresos) * 100)
    : 0;

  // Datos de flujo de caja del backend
  const cashFlowData = dashboardData?.cashFlow || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Panel Financiero CEO"
          subtitle="Control total del negocio - Métricas en tiempo real"
          showBack={false}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Total Ingresos */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Total Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIngresos)}</p>
              <p className="text-xs text-gray-500 mt-1">Ingresos totales registrados</p>
            </CardContent>
          </Card>

          {/* Total Gastos */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Total Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalGastos)}</p>
              <p className="text-xs text-gray-500 mt-1">Gastos totales registrados</p>
            </CardContent>
          </Card>

          {/* Margen Global */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Margen Neto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(margenGlobal)}</p>
              <p className="text-xs text-gray-500 mt-1">{rentabilidadPromedio.toFixed(1)}% rentabilidad</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">Resumen Financiero</CardTitle>
            <CardDescription>Desglose de ingresos, gastos y margen neto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ingresos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Ingresos</h3>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Total Ingresos</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalIngresos)}</span>
                </div>
              </div>

              {/* Gastos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Gastos</h3>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Total Gastos</span>
                  <span className="font-bold text-red-600">{formatCurrency(totalGastos)}</span>
                </div>
              </div>

              {/* Margen */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Margen</h3>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Margen Neto</span>
                  <span className="font-bold text-blue-600">{formatCurrency(margenGlobal)}</span>
                </div>
              </div>
            </div>

            {/* Summary Row */}
            <div className="mt-6 pt-6 border-t-2 space-y-3">
              <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Ingresos Totales</span>
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(totalIngresos)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Gastos Totales</span>
                <span className="font-bold text-lg text-red-600">
                  {formatCurrency(totalGastos)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Margen Neto (Ingresos - Gastos)</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatCurrency(margenGlobal)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Rentabilidad</span>
                <span className="font-bold text-lg text-purple-600">
                  {rentabilidadPromedio.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flujo de Caja - Últimos 6 Meses */}
        {cashFlowData && cashFlowData.length > 0 && (
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold tracking-tight">Flujo de Caja - Últimos 6 Meses</CardTitle>
              <CardDescription>Ingresos vs Egresos por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" />
                  <Bar dataKey="egresos" fill="#dc2626" name="Egresos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-0 shadow-md bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Información del Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p>
              Este dashboard muestra métricas financieras en tiempo real basadas en ingresos registrados en pagos y gastos contabilizados.
              Los datos se actualizan automáticamente. Todos los cálculos se basan en datos reales del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
