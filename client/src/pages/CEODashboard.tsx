import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, DollarSign, TrendingDown, AlertTriangle } from "lucide-react";
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
  // Query para obtener métricas del Panel CEO
  const { data: ceoMetrics, isLoading, error } = trpc.dashboard.getCEOMetrics.useQuery();
  
  // Query para obtener datos del dashboard global (para flujo de caja)
  const { data: dashboardData } = trpc.dashboard.getGlobalDashboard.useQuery();

  // DEBUG LOGS
  useEffect(() => {
    console.log("CEO Metrics:", ceoMetrics);
    console.log("CEO Metrics error:", error);
    console.log("CEO Metrics loading:", isLoading);
  }, [ceoMetrics, error, isLoading]);

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

  if (error || !ceoMetrics) {
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

  // Extraer métricas
  const ingresosRecibidos = Number(ceoMetrics?.ingresosRecibidos) || 0;
  const totalVendido = Number(ceoMetrics?.totalVendido) || 0;
  const porCobrar = Number(ceoMetrics?.porCobrar) || 0;
  const gastos = Number(ceoMetrics?.gastos) || 0;
  const margen = Number(ceoMetrics?.margen) || 0;
  const rentabilidad = Number(ceoMetrics?.rentabilidad) || 0;

  // Datos de flujo de caja del dashboard global
  const cashFlowData = dashboardData?.cashFlow || [];

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Panel Financiero CEO"
          subtitle="Control total del negocio - Métricas en tiempo real"
          showBack={false}
        />

        {/* KPI Cards - Primera fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Ingresos Recibidos */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Ingresos Recibidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(ingresosRecibidos)}</p>
              <p className="text-xs text-gray-500 mt-1">Pagos registrados</p>
            </CardContent>
          </Card>

          {/* Total Vendido */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Total Vendido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalVendido)}</p>
              <p className="text-xs text-gray-500 mt-1">Valor de proyectos</p>
            </CardContent>
          </Card>

          {/* Por Cobrar */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Por Cobrar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(porCobrar)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalVendido > 0 ? `${((porCobrar / totalVendido) * 100).toFixed(1)}% pendiente` : "0% pendiente"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards - Segunda fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Gastos */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Gastos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(gastos)}</p>
              <p className="text-xs text-gray-500 mt-1">Proyectos + Operativos</p>
            </CardContent>
          </Card>

          {/* Margen */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                Margen Neto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(margen)}</p>
              <p className="text-xs text-gray-500 mt-1">Ingresos - Gastos</p>
            </CardContent>
          </Card>

          {/* Rentabilidad */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Rentabilidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{rentabilidad.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">(Margen / Ingresos)</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">Resumen Financiero Detallado</CardTitle>
            <CardDescription>Análisis completo de ingresos, gastos y rentabilidad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ingresos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Ingresos</h3>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Recibidos</span>
                  <span className="font-bold text-green-600">{formatCurrency(ingresosRecibidos)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Total Vendido</span>
                  <span className="font-bold text-blue-600">{formatCurrency(totalVendido)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Por Cobrar</span>
                  <span className="font-bold text-orange-600">{formatCurrency(porCobrar)}</span>
                </div>
              </div>

              {/* Gastos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Gastos</h3>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Total Gastos</span>
                  <span className="font-bold text-red-600">{formatCurrency(gastos)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">% del Ingreso</span>
                  <span className="font-bold text-red-600">
                    {ingresosRecibidos > 0 ? ((gastos / ingresosRecibidos) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* Rentabilidad */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Rentabilidad</h3>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Margen Neto</span>
                  <span className="font-bold text-purple-600">{formatCurrency(margen)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Rentabilidad</span>
                  <span className="font-bold text-amber-600">{rentabilidad.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Summary Boxes */}
            <div className="mt-6 pt-6 border-t-2 space-y-3">
              <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Ingresos Recibidos</span>
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(ingresosRecibidos)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Total Vendido</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatCurrency(totalVendido)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-orange-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Por Cobrar</span>
                <span className="font-bold text-lg text-orange-600">
                  {formatCurrency(porCobrar)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Gastos Totales</span>
                <span className="font-bold text-lg text-red-600">
                  {formatCurrency(gastos)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Margen Neto</span>
                <span className="font-bold text-lg text-purple-600">
                  {formatCurrency(margen)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Rentabilidad</span>
                <span className="font-bold text-lg text-amber-600">
                  {rentabilidad.toFixed(1)}%
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
              Este dashboard muestra métricas financieras reales en tiempo real basadas en:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Ingresos Recibidos:</strong> Pagos registrados en el sistema (movementType = 'payment')</li>
              <li><strong>Total Vendido:</strong> Suma del valor de todos los proyectos activos</li>
              <li><strong>Por Cobrar:</strong> Diferencia entre total vendido e ingresos recibidos</li>
              <li><strong>Gastos:</strong> Suma de todos los gastos registrados (proyectos + operativos)</li>
              <li><strong>Margen Neto:</strong> Ingresos recibidos menos gastos totales</li>
              <li><strong>Rentabilidad:</strong> Porcentaje de margen sobre ingresos recibidos</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
